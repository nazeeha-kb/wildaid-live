import { lazy, Suspense, useEffect, useState } from "react";
import { LocateFixed, RefreshCw, Users } from "lucide-react";
import type { IndividualContact } from "@/lib/individual-contacts";
import type { NearbyCarePlace } from "@/lib/nearby-care.server";
import type { Center } from "@/lib/rehab-data";
import type { LocationStatus, UserLocation } from "@/hooks/use-user-location";

const CapacityMap = lazy(() => import("./CapacityMap"));

export function MapPanel({ location, locationStatus, onRetryLocation, individuals, places, centers, mode, onModeChange, onPing, pingPending }: {
  location: UserLocation | undefined;
  locationStatus: LocationStatus;
  onRetryLocation: () => void;
  individuals: IndividualContact[];
  places: NearbyCarePlace[];
  centers: Center[];
  mode: "centers" | "people";
  onModeChange: (mode: "centers" | "people") => void;
  onPing: (contact: IndividualContact) => void;
  pingPending: string | undefined;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative h-72 w-full overflow-hidden rounded-2xl border border-border bg-muted shadow-sm sm:h-80">
      {mounted ? <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted" />}><CapacityMap location={location} individuals={individuals} places={places} centers={centers} mode={mode} onPing={onPing} pingPending={pingPending} /></Suspense> : <div className="h-full w-full animate-pulse bg-muted" />}
      <div className="absolute left-3 top-3 z-[500] flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border border-border/80 bg-card/95 px-2.5 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur">
        {locationStatus === "ready" ? <><LocateFixed className="size-3.5 text-primary" /> Showing your street-level location</> : locationStatus === "locating" ? <><RefreshCw className="size-3.5 animate-spin text-primary" /> Finding your location</> : <><span>Location unavailable</span><button type="button" onClick={onRetryLocation} className="text-primary underline underline-offset-2">Retry</button></>}
      </div>
      <div className="absolute bottom-3 left-3 z-[500] inline-flex rounded-lg border border-border bg-card/95 p-1 shadow-sm backdrop-blur">
        <button type="button" onClick={() => onModeChange("centers")} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${mode === "centers" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>Care centers</button>
        <button type="button" onClick={() => onModeChange("people")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${mode === "people" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}><Users className="size-3.5" /> People</button>
      </div>
    </section>
  );
}
