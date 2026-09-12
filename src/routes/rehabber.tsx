import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Leaf, LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SPECIES, STATUS_META, timeAgo, type Species, type Status } from "@/lib/rehab";
import { sortCentersByDistance, useBoard, useSetStatus, type Center } from "@/lib/rehab-data";
import { useNow } from "@/hooks/use-now";
import { useUserLocation } from "@/hooks/use-user-location";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/rehabber")({ component: RehabberDashboard });

const STATUSES: Status[] = ["open", "full", "by_appointment"];
const REHABBER_RADIUS_KM = 30;
const REHABBER_RADIUS_MILES = REHABBER_RADIUS_KM * 0.621371;
const FREE_EMAIL_DOMAINS = ["gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "proton.me", "protonmail.com"];

function domain(value: string) {
  return value.trim().toLowerCase().split("@")[1] || "";
}

function websiteDomain(value: string) {
  try { return new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

function validWorkIdentity(email: string, website: string) {
  const emailDomain = domain(email);
  const siteDomain = websiteDomain(website);
  return Boolean(emailDomain && siteDomain && !FREE_EMAIL_DOMAINS.includes(emailDomain) && (emailDomain === siteDomain || emailDomain.endsWith(`.${siteDomain}`)));
}

function RehabberDashboard() {
  const { data: centers, isLoading, isError } = useBoard();
  const { location, status: locationStatus, retry } = useUserLocation();
  const [centerId, setCenterId] = useState<string>();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [codeSent, setCodeSent] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState<string>();
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const center = centers?.find((item) => item.id === centerId);
  const nearbyCenters = location
    ? sortCentersByDistance(centers ?? [], location).filter((item) => item.distance <= REHABBER_RADIUS_MILES)
    : [];

  useEffect(() => {
    if (!seconds) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const requestCode = async () => {
    if (!centerId) return setMessage("Choose your center first.");
    if (!validWorkIdentity(email, website)) return setMessage("Use a work email that matches the center website domain. Personal email providers are not accepted.");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) return setMessage(error.message);
    setCodeSent(true);
    setSeconds(60);
    setMessage("A six-digit verification code was sent to your work email.");
  };

  const verifyCode = async () => {
    if (!centerId || code.join("").length !== 6) return setMessage("Enter the six-digit code from your work email.");
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code.join(""), type: "email" });
    if (error || !data.user) return setMessage(error?.message || "The verification code could not be confirmed.");
    const client = supabase as unknown as { from: (table: string) => any };
    const { error: claimError } = await client.from("centers").update({ work_email: email.toLowerCase(), website: websiteDomain(website), owner_user_id: data.user.id }).eq("id", centerId);
    if (claimError) return setMessage(claimError.message);
    setVerified(true);
    setMessage("Work email verified. You can now update this center's availability.");
  };

  return <div className="min-h-screen bg-background">
    <header className="border-b border-border/70 bg-card/60 backdrop-blur"><div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4"><Link to="/" search={{}} className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-primary/12 text-primary"><Leaf className="size-4" /></span><span className="font-display text-lg font-semibold">AnimalAid</span></Link><Link to="/" search={{}} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">Caller view</Link></div></header>
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-6"><Link to="/" search={{}} className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back</Link><p className="inline-flex rounded-lg bg-open-soft px-2.5 py-1 text-sm font-semibold text-open">Rehabber dashboard</p><h1 className="mt-1 font-display text-3xl">Manage your center</h1><p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">Verify your work email before publishing capacity updates.</p>
      <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">Your location</span>{locationStatus === "ready" ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-open"><LocateFixed className="size-3.5" /> Nearby centers first</span> : <button type="button" onClick={retry} className="text-xs font-semibold text-primary">Enable location</button>}</div></div>
      <label className="mt-6 block text-sm font-semibold" htmlFor="center">Your center</label><select id="center" value={centerId ?? ""} onChange={(event) => { setCenterId(event.target.value || undefined); setVerified(false); }} disabled={isLoading || isError || !location} className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"><option value="">{isLoading ? "Loading centers..." : !location ? "Enable location to find nearby centers" : nearbyCenters.length ? "Select your center" : "No centers within 30 km"}</option>{nearbyCenters.map((item) => <option key={item.id} value={item.id}>{item.name} ({(item.distance / 0.621371).toFixed(1)} km)</option>)}</select>
      {center && !verified && <section className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm"><h2 className="font-display text-lg">Verify your work email</h2><p className="mt-1 text-sm text-muted-foreground">The work email must use the same domain as the center website.</p><label className="mt-4 block text-xs font-semibold text-muted-foreground" htmlFor="work-email">Work email</label><input id="work-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="intake@yourcenter.org" className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" /><label className="mt-3 block text-xs font-semibold text-muted-foreground" htmlFor="website">Center website</label><input id="website" type="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="yourcenter.org" className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        {!codeSent ? <button type="button" onClick={requestCode} className="mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Send six-digit code</button> : <><div className="mt-4 flex gap-2">{code.map((value, index) => <input key={index} ref={(element) => { inputs.current[index] = element; }} value={value} inputMode="numeric" maxLength={1} aria-label={`Verification digit ${index + 1}`} onChange={(event) => { const next = [...code]; next[index] = event.target.value.replace(/\D/g, "").slice(-1); setCode(next); if (next[index] && index < 5) inputs.current[index + 1]?.focus(); }} className="size-11 rounded-lg border border-input bg-background text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-ring" />)}</div><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={verifyCode} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Verify code</button><button type="button" disabled={seconds > 0} onClick={requestCode} className="text-sm font-semibold text-primary disabled:text-muted-foreground">{seconds ? `Resend in ${seconds}s` : "Resend code"}</button></div></>}</section>}
      {message && <p className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground" role="status">{message}</p>}
      {isError ? <p className="mt-4 rounded-xl bg-full-soft p-4 text-sm text-full">Centers could not be loaded. Please try again in a moment.</p> : center && verified ? <StatusList center={center} /> : <p className="mt-8 text-center text-sm text-muted-foreground">Choose and verify your center to update its species capacity.</p>}
    </main></div>;
}

function StatusList({ center }: { center: Center }) {
  const now = useNow(10000);
  const setStatus = useSetStatus();
  return <section className="mt-8" aria-label={`${center.name} species capacity`}><div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-display text-xl">Current capacity</h2><span className="text-xs text-muted-foreground">updates live</span></div><div className="grid gap-3">{SPECIES.map((species) => { const entry = center.statuses[species.id]; const status = entry?.status ?? "full"; const updatedAt = entry?.updatedAt ?? center.lastUpdated; return <div key={species.id} className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-xl">{species.emoji}</span><div className="min-w-0 flex-1"><h3 className="font-display text-lg leading-tight">{species.label}</h3><p className="mt-1 text-xs text-muted-foreground">Updated {timeAgo(updatedAt, now)}</p></div></div><div className="mt-4 grid grid-cols-3 gap-2">{STATUSES.map((option) => { const meta = STATUS_META[option]; const selected = status === option; return <button key={option} type="button" aria-pressed={selected} onClick={() => { if (status !== option) setStatus.mutate({ centerId: center.id, species: species.id, status: option }); }} className={`min-h-11 rounded-xl px-2 py-2 text-xs font-semibold transition-colors tap-press ${selected ? `${meta.bg} ${meta.text} ring-2 ring-current/20` : "bg-muted text-muted-foreground hover:bg-accent"}`}>{meta.label}</button>; })}</div></div>; })}</div></section>;
}
