import { useQuery } from "@tanstack/react-query";
import { getNearbyCarePlaces } from "@/lib/nearby-care.server";
import type { UserLocation } from "@/hooks/use-user-location";

export function useNearbyCarePlaces(location?: UserLocation) {
  return useQuery({
    queryKey: ["nearby-care-places", location?.latitude, location?.longitude],
    enabled: Boolean(location),
    queryFn: () => getNearbyCarePlaces({ data: { latitude: location!.latitude, longitude: location!.longitude } }),
    staleTime: 5 * 60_000,
  });
}
