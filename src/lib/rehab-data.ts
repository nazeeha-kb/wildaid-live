import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { distanceMiles, type Coordinates, type Species, type Status } from "./rehab";

export type CenterRow = {
  id: string;
  name: string;
  phone: string;
  latitude: number;
  longitude: number;
};

export type StatusRow = {
  id: string;
  center_id: string;
  species: Species;
  status: Status;
  updated_at: string;
};

export type Center = CenterRow & {
  statuses: Record<Species, { status: Status; updatedAt: string }>;
  lastUpdated: string;
};

export type NearbyCenter = Center & { distance: number };

export function sortCentersByDistance(centers: Center[], location: Coordinates): NearbyCenter[] {
  return centers.map((center) => ({ ...center, distance: distanceMiles(location, center) })).sort((a, b) => a.distance - b.distance);
}

async function fetchBoard(): Promise<Center[]> {
  const [{ data: centers, error: e1 }, { data: statuses, error: e2 }] = await Promise.all([
    supabase.from("centers").select("id,name,phone,latitude,longitude"),
    supabase.from("center_species_status").select("id,center_id,species,status,updated_at"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  return ((centers ?? []) as CenterRow[])
    .map((c) => {
      const rows = ((statuses ?? []) as StatusRow[]).filter((s) => s.center_id === c.id);
      const map = {} as Center["statuses"];
      for (const r of rows) map[r.species] = { status: r.status, updatedAt: r.updated_at };
      const lastUpdated = rows
        .map((r) => r.updated_at)
        .sort()
        .at(-1);
      return {
        ...c,
        statuses: map,
        lastUpdated: lastUpdated ?? new Date().toISOString(),
      };
    });
}

export const boardKey = ["rehab-board"] as const;

export function useBoard() {
  const queryClient = useQueryClient();

  // Live updates: realtime push, plus a light poll as a safety net.
  useEffect(() => {
    const channel = supabase
      .channel("capacity-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "center_species_status" },
        () => {
          queryClient.invalidateQueries({ queryKey: boardKey });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: boardKey,
    queryFn: fetchBoard,
    refetchInterval: 5000,
    staleTime: 0,
  });
}

export function useSetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { centerId: string; species: Species; status: Status }) => {
      const { error } = await supabase
        .from("center_species_status")
        .update({ status: vars.status })
        .eq("center_id", vars.centerId)
        .eq("species", vars.species);
      if (error) throw error;
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: boardKey });
      const previous = queryClient.getQueryData<Center[]>(boardKey);
      const now = new Date().toISOString();
      queryClient.setQueryData<Center[]>(boardKey, (old) =>
        (old ?? []).map((c) =>
          c.id === vars.centerId
            ? {
                ...c,
                lastUpdated: now,
                statuses: { ...c.statuses, [vars.species]: { status: vars.status, updatedAt: now } },
              }
            : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(boardKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKey });
    },
  });
}
