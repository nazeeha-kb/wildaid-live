import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Phone, MapPin, Info, RefreshCw, Leaf } from "lucide-react";
import { MapPanel } from "@/components/MapPanel";
import { useNow } from "@/hooks/use-now";
import { useBoard, type Center } from "@/lib/rehab-data";
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
      { title: "HasRoom — Who has room for wildlife right now" },
      {
        name: "description",
        content:
          "A live capacity board for wildlife rehabbers near Pittsburgh. See who can take in a bird, fawn, raccoon or turtle right now — updated by rehabbers in real time.",
      },
      { property: "og:title", content: "HasRoom — Who has room for wildlife right now" },
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
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link to="/" search={{}} className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/12 text-primary">
              <Leaf className="size-4" />
            </span>
            <span className="font-display text-lg font-semibold">HasRoom</span>
          </Link>
          <Link
            to="/auth"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground tap-press hover:bg-accent"
          >
            I'm a rehabber
          </Link>
        </div>
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          For rehabbers
        </p>
        <h2 className="mt-2 font-display text-xl font-semibold">
          Keep your capacity up to date.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Update your availability so people can quickly find a rehabber who has room for wildlife right now.
        </p>
        <Link
          to="/auth"
          className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground tap-press hover:bg-primary/90"
        >
          I'm a rehabber
        </Link>
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
  const { data: centers, isLoading } = useBoard();

  const set = (next: Search) => navigate({ search: next });

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
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-open-soft px-3 py-1 text-xs font-medium text-open">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-open opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-open" />
          </span>
          {isLoading ? "Checking capacity…" : `${openCount} centers currently open near you`}
        </p>
        <h1 className="font-display text-3xl leading-tight">
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
            className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm tap-press hover:border-primary/40 hover:shadow-md"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-2xl">
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
  const meta = SPECIES.find((s) => s.id === species)!;
  const available = (centers ?? []).filter((c) => {
    const s = c.statuses[species]?.status;
    return s === "open" || s === "by_appointment";
  });

  return (
    <Shell>
      <BackLink onBack={onBack} />
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">
            {available.length > 0
              ? `${available.length} ${available.length === 1 ? "center has" : "centers have"} room`
              : "No capacity right now"}
          </h1>
          <p className="text-sm text-muted-foreground">
            For {meta.plural} · nearest first · updates live
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] text-muted-foreground">
          <RefreshCw className="size-3" /> live
        </span>
      </div>

      {isLoading ? (
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      ) : available.length === 0 ? (
        <EmptyState speciesLabel={meta.plural} />
      ) : (
        <>
          <MapPanel centers={available} species={species} />
          <div className="mt-4 grid gap-3">
            {available.map((c) => (
              <ResultCard key={c.id} center={c} species={species} now={now} />
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}

function ResultCard({ center, species, now }: { center: Center; species: Species; now: number }) {
  const entry = center.statuses[species];
  const status: Status = entry?.status ?? "full";
  const meta = STATUS_META[status];
  const alsoOpen = SPECIES.filter(
    (s) => s.id !== species && center.statuses[s.id]?.status === "open",
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-snug">{center.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" /> {center.distance.toFixed(1)} mi away
          </p>
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
      <div className="mt-6 rounded-2xl bg-muted/70 p-4">
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
