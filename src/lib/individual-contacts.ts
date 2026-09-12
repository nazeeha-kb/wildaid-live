import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UserLocation } from "@/hooks/use-user-location";
import { distanceMiles } from "@/lib/rehab";

export type IndividualContact = {
  id: string;
  display_name: string;
  latitude: number;
  longitude: number;
};

const PEOPLE_RADIUS_MILES = 25;

export function useIndividualContacts(location?: UserLocation, enabled = true) {
  return useQuery({
    queryKey: ["individual-contact-map", location?.latitude, location?.longitude, enabled],
    queryFn: async (): Promise<IndividualContact[]> => {
      const client = supabase as unknown as { from: (table: string) => { select: (columns: string) => PromiseLike<{ data: IndividualContact[] | null; error: Error | null }> } };
      const { data, error } = await client.from("individual_contact_map").select("id,display_name,latitude,longitude");
      if (error) throw error;
      if (!location) return [];
      return (data ?? [])
        .map((contact) => ({ ...contact, distance: distanceMiles(location, contact) }))
        .filter((contact) => contact.distance <= PEOPLE_RADIUS_MILES)
        .sort((a, b) => a.distance - b.distance)
        .map(({ distance: _distance, ...contact }) => contact);
    },
    enabled: enabled && Boolean(location),
    staleTime: 30_000,
  });
}
