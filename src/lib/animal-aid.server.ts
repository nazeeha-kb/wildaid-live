import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const admin = supabaseAdmin as unknown as { from: (table: string) => any };

type ImageAnalysisInput = { imageBase64: string; mimeType: string };
type PingInput = { contactId: string; description: string; latitude: number; longitude: number; replyTo: string };

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}

export const analyzeAnimalImage = createServerFn({ method: "POST" })
  .inputValidator((input: ImageAnalysisInput) => ({
    imageBase64: requireString(input.imageBase64, "Image"),
    mimeType: requireString(input.mimeType, "Image type"),
  }))
  .handler(async ({ data }) => {
    if (data.imageBase64.length > 8_000_000) throw new Error("Use an image smaller than 6 MB.");

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    if (!apiKey) throw new Error("Image analysis is not configured.");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: "Analyze this wildlife-help image and return exactly two complete, useful sentences. Each sentence must be 18 to 32 words, directed to a licensed wildlife rehabilitator. Identify the animal only if reasonably visible, describe directly observable condition or risks without diagnosing, and never stop after a sentence fragment." },
          { inlineData: { mimeType: data.mimeType, data: data.imageBase64 } },
        ] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 384 },
      }),
    });
    if (!response.ok) throw new Error("Image analysis is temporarily unavailable.");
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const description = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join(" ").trim();
    if (!description || !/[.!?]\s+.+[.!?]$/.test(description)) throw new Error("The image analysis was incomplete. Please analyze the photo again.");
    return { description };
  });

export const sendAnimalAidPing = createServerFn({ method: "POST" })
  .inputValidator((input: PingInput) => ({
    contactId: requireString(input.contactId, "Contact"),
    description: requireString(input.description, "Description").slice(0, 1_000),
    replyTo: requireString(input.replyTo, "Reply email"),
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
  }))
  .handler(async ({ data }) => {
    if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) throw new Error("A current location is required to send a ping.");
    const { data: contact, error: contactError } = await admin
      .from("individual_contacts")
      .select("id,display_name,email")
      .eq("id", data.contactId)
      .eq("is_available", true)
      .single();
    if (contactError || !contact) throw new Error("This contact is no longer available.");

    const { data: ping, error: pingError } = await admin
      .from("assistance_pings")
      .insert({ recipient_id: contact.id, description: data.description, latitude: data.latitude, longitude: data.longitude })
      .select("id")
      .single();
    if (pingError || !ping) throw new Error("The ping could not be created.");

    const appUrl = process.env.APP_URL;
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!resendKey || !from || !appUrl) return { id: ping.id, delivery: "saved" as const };

    const pingUrl = `${appUrl.replace(/\/$/, "")}/?ping=${encodeURIComponent(ping.id)}`;
    const email = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [contact.email],
        reply_to: data.replyTo,
        subject: "Someone needs your attention on AnimalAid",
        html: `<p>A nearby AnimalAid user needs assistance.</p><p>${data.description.replace(/[<>&]/g, "")}</p><p><a href="${pingUrl}">Open this ping</a></p>`,
      }),
    });
    if (!email.ok) throw new Error("The ping was saved, but the email could not be sent.");
    return { id: ping.id, delivery: "email" as const };
  });
