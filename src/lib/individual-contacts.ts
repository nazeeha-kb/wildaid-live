import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UserLocation } from "@/hooks/use-user-location";
import { distanceMiles } from "@/lib/rehab";
import { displayNameForUser } from "@/lib/auth";

export type IndividualContact = {
  id: string;
  display_name: string;
  user_id?: string | null;
  latitude: number;
  longitude: number;
};

const PEOPLE_RADIUS_MILES = 100;

export function useIndividualContacts(location?: UserLocation, enabled = true) {
  return useQuery({
    queryKey: ["individual-contact-map", location?.latitude, location?.longitude, enabled],
    queryFn: async (): Promise<IndividualContact[]> => {
      const client = supabase as unknown as { auth: { getUser: () => Promise<{ data: { user: { id: string; user_metadata?: Record<string, unknown>; email?: string } | null } }> }; from: (table: string) => any };
      const { data: userData } = await client.auth.getUser();
      if (!location) return [];
      const currentUserId = userData.user?.id;
      if (currentUserId) {
        const { data: existing } = await client.from("individual_contacts").select("id").eq("user_id", currentUserId).maybeSingle();
        const metadataName = userData.user.user_metadata?.["full_name"];
        const contact = {
          display_name: typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : userData.user.email?.split("@")[0] || "AnimalAid user",
          email: userData.user.email || "",
          latitude: location.latitude,
          longitude: location.longitude,
          is_available: true,
          share_location: true,
          user_id: currentUserId,
        };
        if (existing?.id) await client.from("individual_contacts").update(contact).eq("id", existing.id);
        else await client.from("individual_contacts").insert(contact);
      }
      const { data, error } = await client.from("individual_contact_map").select("id,display_name,user_id,latitude,longitude");
      if (error) throw error;
      return (data ?? [])
        .filter((contact) => !currentUserId || contact.user_id !== currentUserId)
        .map((contact) => ({ ...contact, distance: distanceMiles(location, contact) }))
        .filter((contact) => contact.distance <= PEOPLE_RADIUS_MILES)
        .sort((a, b) => a.distance - b.distance)
        .map(({ distance: _distance, ...contact }) => contact);
    },
    enabled: enabled && Boolean(location),
    staleTime: 30_000,
  });
}
