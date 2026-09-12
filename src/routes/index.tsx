import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Phone, MapPin, Info, RefreshCw, Leaf, Navigation, LogIn, LogOut } from "lucide-react";
import { MapPanel } from "@/components/MapPanel";
import { ImageReportComposer } from "@/components/ImageReportComposer";
import { useUserLocation } from "@/hooks/use-user-location";
import { useNow } from "@/hooks/use-now";
import { sortCentersByDistance, useBoard, type Center, type NearbyCenter } from "@/lib/rehab-data";
import { useIndividualContacts, type IndividualContact } from "@/lib/individual-contacts";
import { useNearbyCarePlaces } from "@/lib/nearby-care";
import type { NearbyCarePlace } from "@/lib/nearby-care.server";
import { sendAnimalAidPing } from "@/lib/animal-aid.server";
import { playPingSound } from "@/lib/ping-sound";
import { useSupabaseSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  SPECIES,
  SITUATIONS,
  STATUS_META,
  STATE_HOTLINE,
  reassurance,
  timeAgo,
  type Species,
  type SituationId,
  type Status,
} from "@/lib/rehab";

type Search = { species?: Species; situation?: SituationId; go?: boolean };

const SPECIES_IDS = SPECIES.map((s) => s.id);
const SITUATION_IDS = SITUATIONS.map((s) => s.id);

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const parsed: Search = {};
    if (SPECIES_IDS.includes(search["species"] as Species)) parsed.species = search["species"] as Species;
    if (SITUATION_IDS.includes(search["situation"] as SituationId)) {
      parsed.situation = search["situation"] as SituationId;
    }
    if (search["go"] === true || search["go"] === "true") parsed.go = true;
    return parsed;
  },
  head: () => ({
    meta: [
      { title: "AnimalAid | Live wildlife care availability" },
      {
        name: "description",
        content:
          "A live capacity board for wildlife care, with nearby real-world wildlife care and veterinary listings.",
      },
      { property: "og:title", content: "AnimalAid | Live wildlife care availability" },
      {
        property: "og:description",
        content:
          "Found an animal? See which wildlife rehabbers currently have capacity for that species, not just a static directory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Triage,
});

function tel(phone: string) {
  return `tel:${phone.replace(/[^\d]/g, "")}`;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useSupabaseSession();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link to="/" search={{}} className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/12 text-primary">
              <Leaf className="size-4" />
            </span>
            <span className="font-display text-lg font-semibold">AnimalAid</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/rehabber"
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm tap-press hover:bg-accent"
            >
              I'm a rehabber
            </Link>
            {user ? (
              <button type="button" onClick={() => void supabase.auth.signOut()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm tap-press hover:bg-primary/90">
                <LogOut className="size-3.5" /> Log out
              </button>
            ) : (
              <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm tap-press hover:bg-primary/90">
                <LogIn className="size-3.5" /> Login
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">{children}</main>
      <footer className="mx-auto max-w-2xl px-5 pb-10 text-center text-xs leading-relaxed text-muted-foreground">
        Not a replacement for your state wildlife hotline — a live view of who has room right now.
      </footer>
    </div>
  );
}

function Triage() {
  const { species, situation, go } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const { user, isLoading: sessionLoading } = useSupabaseSession();
  const { data: centers, isLoading } = useBoard();

  const set = (next: Search) => navigate({ search: next });

  if (sessionLoading) {
    return <div className="grid min-h-screen place-items-center bg-background px-5 text-sm text-muted-foreground">Checking your account...</div>;
  }

  if (!user) return <Navigate to="/auth" />;

  if (!species)
    return <Landing centers={centers ?? []} isLoading={isLoading} onPick={(s) => set({ species: s })} />;

  if (!situation)
    return (
      <StepSituation
        species={species}
        onBack={() => set({})}
        onPick={(sit) => set({ species, situation: sit })}
      />
    );

  const tip = reassurance(species, situation);
  if (tip && !go)
    return (
      <Reassurance
        tip={tip}
        onBack={() => set({ species })}
        onContinue={() => set({ species, situation, go: true })}
      />
    );

  return (
    <Results
      species={species}
      centers={centers ?? []}
      isLoading={isLoading}
      onBack={() => set({ species })}
    />
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground tap-press hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Back
    </button>
  );
}

function Landing({
  centers,
  isLoading,
  onPick,
}: {
  centers?: Center[];
  isLoading: boolean;
  onPick: (s: Species) => void;
}) {
  const openCount = (centers ?? []).filter((c) =>
    Object.values(c.statuses).some((s) => s.status === "open"),
  ).length;

  return (
    <Shell>
      <div className="mb-7">
        <p className="mb-4 inline-flex items-center gap-2 rounded-lg border border-open/10 bg-open-soft px-3 py-1.5 text-xs font-semibold text-open">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-open opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-open" />
          </span>
          {isLoading ? "Checking capacity…" : `${openCount} centers currently open near you`}
        </p>
        <h1 className="max-w-xl font-display text-3xl leading-tight sm:text-4xl">
          Found an animal? Let's find someone with room.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Rehabbers update their capacity live. We'll only show you the ones who can actually take
          your animal today.
        </p>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        What kind of animal did you find?
      </h2>
      <div className="grid gap-3">
        {SPECIES.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-4 text-left shadow-sm tap-press hover:border-primary/40 hover:shadow-md"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent text-2xl transition-transform group-hover:scale-105">
              {s.emoji}
            </span>
            <span className="min-w-0">
              <span className="block font-display text-lg font-semibold">{s.label}</span>
              <span className="block text-sm text-muted-foreground">{s.examples}</span>
            </span>
          </button>
        ))}
      </div>
    </Shell>
  );
}

function StepSituation({
  species,
  onBack,
  onPick,
}: {
  species: Species;
  onBack: () => void;
  onPick: (s: SituationId) => void;
}) {
  const meta = SPECIES.find((s) => s.id === species)!;
  return (
    <Shell>
      <BackLink onBack={onBack} />
      <p className="text-sm text-muted-foreground">
        {meta.emoji} {meta.label}
      </p>
      <h1 className="mb-6 mt-1 font-display text-2xl">What's the situation?</h1>
      <div className="grid gap-3">
        {SITUATIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className="rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm tap-press hover:border-primary/40 hover:shadow-md"
          >
            <span className="block font-medium">{s.label}</span>
            <span className="block text-sm text-muted-foreground">{s.hint}</span>
          </button>
        ))}
      </div>
    </Shell>
  );
}

function Reassurance({
  tip,
  onBack,
  onContinue,
}: {
  tip: NonNullable<ReturnType<typeof reassurance>>;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <Shell>
      <BackLink onBack={onBack} />
      <div className="rounded-3xl border border-appt/30 bg-appt-soft/70 p-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium text-appt">
          <Info className="size-3.5" /> Take a breath first
        </span>
        <h1 className="mt-3 font-display text-2xl">{tip.title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">{tip.body}</p>
        <ul className="mt-4 space-y-2">
          {tip.signs.map((s) => (
            <li key={s} className="flex gap-2 text-sm leading-relaxed text-foreground/80">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-appt" />
              {s}
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={onContinue}
        className="mt-5 w-full rounded-2xl bg-primary px-4 py-4 font-medium text-primary-foreground shadow-sm tap-press hover:bg-primary/90"
      >
        It still needs help — show me who has room
      </button>
      <button
        onClick={onBack}
        className="mt-2 w-full rounded-2xl px-4 py-3 text-sm text-muted-foreground tap-press hover:bg-accent"
      >
        I'll leave it alone and watch
      </button>
    </Shell>
  );
}

function Results({
  species,
  centers,
  isLoading,
  onBack,
}: {
  species: Species;
  centers?: Center[];
  isLoading: boolean;
  onBack: () => void;
}) {
  const now = useNow(10000);
  const { location, status: locationStatus, retry: retryLocation } = useUserLocation();
  const { isLoading: sessionLoading } = useSupabaseSession();
  const { data: individuals = [], refetch: refreshIndividuals } = useIndividualContacts(location);
  const { data: places = [], isLoading: placesLoading } = useNearbyCarePlaces(location);
  const [description, setDescription] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [mapMode, setMapMode] = useState<"centers" | "people">("centers");
  const [pingPending, setPingPending] = useState<string>();
  const [pingMessage, setPingMessage] = useState<string>();
  const meta = SPECIES.find((s) => s.id === species)!;
  const available = (centers ?? []).filter((c) => {
    const s = c.statuses[species]?.status;
    return s === "open" || s === "by_appointment";
  });
  const nearby = location ? sortCentersByDistance(available, location) : available;

  const sendPing = async (contact: IndividualContact) => {
    if (!location) {
      setPingMessage("Allow location access before sending a ping.");
      return;
    }
    if (!description.trim()) {
      setPingMessage("Add a short description before sending a ping.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(replyTo)) {
      setPingMessage("Enter your email so the person helping can reply.");
      return;
    }
    setPingPending(contact.id);
    setPingMessage(undefined);
    try {
      const result = await sendAnimalAidPing({ data: { contactId: contact.id, description, latitude: location.latitude, longitude: location.longitude, replyTo } });
      playPingSound();
      setPingMessage(result.delivery === "email" ? `Ping sent to ${contact.display_name}.` : `Ping saved for ${contact.display_name}; email delivery needs server mail settings.`);
    } catch (cause) {
      setPingMessage(cause instanceof Error ? cause.message : "The ping could not be sent.");
    } finally {
      setPingPending(undefined);
    }
  };

  return (
    <Shell>
      <BackLink onBack={onBack} />
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">
            {location ? "Nearby wildlife care and vets" : "Find nearby wildlife care"}
          </h1>
          <p className="text-sm text-muted-foreground">
            For {meta.plural} · nearest first · updates live
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] text-muted-foreground">
          <button type="button" onClick={() => { retryLocation(); void refreshIndividuals(); }} disabled={locationStatus === "locating"} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-60" aria-label="Refresh your current location">
            <RefreshCw className={`size-3 ${locationStatus === "locating" ? "animate-spin" : ""}`} /> live
          </button>
        </span>
      </div>

      {isLoading && !location ? (
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      ) : !location && available.length === 0 ? (
        <EmptyState speciesLabel={meta.plural} />
      ) : (
        <>
          <ImageReportComposer description={description} onDescriptionChange={setDescription} email={replyTo} onEmailChange={setReplyTo} />
          <MapPanel location={location} locationStatus={locationStatus} onRetryLocation={() => { retryLocation(); void refreshIndividuals(); }} individuals={individuals} places={places} mode={mapMode} onModeChange={setMapMode} onPing={sendPing} pingPending={pingPending} />
          {pingMessage && <p className="mt-3 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground" role="status">{pingMessage}</p>}
          <div className="mt-4 grid gap-3">
            {mapMode === "people" ? (
              individuals.length ? individuals.map((person) => <PersonCard key={person.id} person={person} onPing={sendPing} pingPending={pingPending} />) : <NearbyEmpty title="No people nearby right now" body={sessionLoading ? "Checking for nearby AnimalAid users." : "No opted-in AnimalAid users are within 100 miles of your current location."} />
            ) : placesLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-muted" />
            ) : places.length ? (
              places.map((place) => <CarePlaceCard key={place.id} place={place} />)
            ) : (
              <NearbyEmpty title="No nearby care locations found" body="Try widening your search area or contact your local wildlife authority for guidance." />
            )}
          </div>
        </>
      )}
    </Shell>
  );
}

function CarePlaceCard({ place }: { place: NearbyCarePlace }) {
  return <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-display text-lg leading-snug">{place.name}</h3><p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"><Navigation className="size-3.5 text-primary" /> {place.distance.toFixed(1)} mi away</p></div><span className="shrink-0 rounded-full bg-appt-soft px-2.5 py-1 text-xs font-semibold text-appt">{place.kind}</span></div>
    {place.address && <p className="mt-3 text-sm text-muted-foreground">{place.address}</p>}
    <div className="mt-4 flex flex-wrap items-center gap-2">{place.phone && <a href={tel(place.phone)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground tap-press hover:bg-primary/90"><Phone className="size-4" /> Call</a>}{place.website && <a href={place.website} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">Website</a>}</div>
  </div>;
}

function PersonCard({ person, onPing, pingPending }: { person: IndividualContact; onPing: (person: IndividualContact) => void; pingPending?: string }) {
  return <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h3 className="font-display text-lg">{person.display_name}</h3><p className="mt-0.5 text-sm text-muted-foreground">Available on AnimalAid</p></div><button type="button" onClick={() => onPing(person)} disabled={pingPending === person.id} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{pingPending === person.id ? "Sending" : "Ping"}</button></div></div>;
}

function NearbyEmpty({ title, body }: { title: string; body: string }) {
  return <div className="rounded-xl border border-border bg-card p-5 text-center shadow-sm"><h2 className="font-display text-lg">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p></div>;
}

function SignInEmpty({ loading }: { loading: boolean }) {
  return <div className="rounded-xl border border-border bg-card p-5 text-center shadow-sm"><h2 className="font-display text-lg">{loading ? "Checking your account" : "Login to see nearby people"}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Only signed-in AnimalAid users can view opted-in people near their current location.</p><Link to="/auth" className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">Login or create account</Link></div>;
}

function ResultCard({ center, species, now }: { center: Center | NearbyCenter; species: Species; now: number }) {
  const entry = center.statuses[species];
  const status: Status = entry?.status ?? "full";
  const meta = STATUS_META[status];
  const alsoOpen = SPECIES.filter(
    (s) => s.id !== species && center.statuses[s.id]?.status === "open",
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-snug">{center.name}</h3>
          {"distance" in center ? (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"><Navigation className="size-3.5 text-primary" /> {center.distance.toFixed(1)} mi away</p>
          ) : (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" /> Location pending</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.bg} ${meta.text}`}
        >
          {meta.label}
        </span>
      </div>

      {alsoOpen.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Also open for {alsoOpen.map((s) => s.plural).join(", ")}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <a
          href={tel(center.phone)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground tap-press hover:bg-primary/90"
        >
          <Phone className="size-4" /> {center.phone}
        </a>
        <span className="text-xs text-muted-foreground">
          updated {timeAgo(entry?.updatedAt ?? center.lastUpdated, now)}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ speciesLabel }: { speciesLabel: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-7 text-center shadow-sm">
      <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-2xl">
        🍃
      </span>
      <h2 className="font-display text-xl">No one nearby currently has capacity for {speciesLabel}.</h2>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
        This is normal during busy season. Statuses update constantly — keep this page open and it
        will refresh itself the moment a center opens up.
      </p>
      <div className="mt-6 rounded-xl border border-border bg-muted/70 p-4">
        <p className="text-sm text-muted-foreground">In the meantime, call for guidance:</p>
        <a
          href={tel(STATE_HOTLINE.phone)}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground tap-press hover:bg-primary/90"
        >
          <Phone className="size-4" /> {STATE_HOTLINE.label} · {STATE_HOTLINE.phone}
        </a>
      </div>
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        Keep the animal in a dark, quiet, ventilated box away from pets. Don't offer food or water.
      </p>
    </div>
  );
}
