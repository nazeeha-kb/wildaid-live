import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Leaf } from "lucide-react";
import { useState } from "react";
import { SPECIES, STATUS_META, timeAgo, type Species, type Status } from "@/lib/rehab";
import { useBoard, useSetStatus } from "@/lib/rehab-data";
import type { Center } from "@/lib/rehab-data";
import { useNow } from "@/hooks/use-now";

export const Route = createFileRoute("/rehabber")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      throw redirect({ to: "/auth" });
    }
  },
  component: RehabberDashboard,
});

const STATUSES: Status[] = ["open", "full", "by_appointment"];

function RehabberDashboard() {
  const { data: centers, isLoading, isError } = useBoard();
  const [centerId, setCenterId] = useState<string>();
  const center = centers?.find((item) => item.id === centerId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link to="/" search={{}} className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/12 text-primary">
              <Leaf className="size-4" />
            </span>
            <span className="font-display text-lg font-semibold">RehabStatus</span>
          </Link>
          <div className="flex items-center gap-3">
  <Link
    to="/"
    search={{}}
    className="text-sm text-muted-foreground hover:text-foreground"
  >
    Caller view
  </Link>

  <button
    type="button"
    onClick={async () => {
      await supabase.auth.signOut();
      window.location.href = "/auth";
    }}
    className="text-sm text-muted-foreground hover:text-foreground"
  >
    Sign out
  </button>
</div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <Link
          to="/"
          search={{}}
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <p className="text-sm font-medium text-primary">Rehabber dashboard</p>
        <h1 className="mt-1 font-display text-3xl">Who has room today?</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Update your intake capacity in one tap. Changes appear on the public board immediately.
        </p>

        <label className="mt-7 block text-sm font-semibold" htmlFor="center">
          Your center
        </label>
        <select
          id="center"
          value={centerId ?? ""}
          onChange={(event) => setCenterId(event.target.value || undefined)}
          disabled={isLoading || isError}
          className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{isLoading ? "Loading centers…" : "Select your center"}</option>
          {(centers ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        {isError ? (
          <p className="mt-4 rounded-xl bg-full-soft p-4 text-sm text-full">
            Centers could not be loaded. Please try again in a moment.
          </p>
        ) : center ? (
          <StatusList center={center} />
        ) : (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Select your center to update its species capacity.
          </p>
        )}
      </main>
    </div>
  );
}

function StatusList({ center }: { center: Center }) {
  const now = useNow(10000);
  const setStatus = useSetStatus();

  const updateStatus = (species: Species, status: Status) => {
    if (center.statuses[species]?.status === status) return;
    setStatus.mutate({ centerId: center.id, species, status });
  };

  return (
    <section className="mt-8" aria-label={`${center.name} species capacity`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl">Current capacity</h2>
        <span className="text-xs text-muted-foreground">updates live</span>
      </div>
      <div className="grid gap-3">
        {SPECIES.map((species) => {
          const entry = center.statuses[species.id];
          const status = entry?.status ?? "full";
          const updatedAt = entry?.updatedAt ?? center.lastUpdated;

          return (
            <div key={species.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-xl">
                  {species.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg leading-tight">{species.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {timeAgo(updatedAt, now)}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {STATUSES.map((option) => {
                  const meta = STATUS_META[option];
                  const selected = status === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateStatus(species.id, option)}
                      className={`min-h-11 rounded-xl px-2 py-2 text-xs font-semibold transition-colors tap-press ${
                        selected
                          ? `${meta.bg} ${meta.text} ring-2 ring-current/20`
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}