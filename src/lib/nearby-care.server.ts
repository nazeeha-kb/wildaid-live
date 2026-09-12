import { createServerFn } from "@tanstack/react-start";
import { distanceMiles, type Coordinates } from "@/lib/rehab";

export type NearbyCarePlace = {
  id: string;
  name: string;
  kind: "Wildlife care" | "Veterinary care";
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  website?: string;
  distance: number;
};

export const getNearbyCarePlaces = createServerFn({ method: "GET" })
  .inputValidator((input: Coordinates) => ({ latitude: Number(input.latitude), longitude: Number(input.longitude) }))
  .handler(async ({ data }): Promise<NearbyCarePlace[]> => {
    if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) return [];
    const query = `[out:json][timeout:25];(nwr[amenity=veterinary](around:100000,${data.latitude},${data.longitude});nwr[healthcare=animal](around:100000,${data.latitude},${data.longitude});nwr[office=veterinarian](around:100000,${data.latitude},${data.longitude});nwr[animal_shelter](around:100000,${data.latitude},${data.longitude});nwr[amenity=animal_boarding](around:100000,${data.latitude},${data.longitude});nwr["animal:wildlife_rehabilitation"="yes"](around:100000,${data.latitude},${data.longitude}););out center tags;`;
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }),
    });
    if (!response.ok) throw new Error("Nearby care listings are temporarily unavailable.");
    const payload = await response.json() as { elements?: Array<{ type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
    const origin = { latitude: data.latitude, longitude: data.longitude };
    return (payload.elements ?? []).flatMap((element) => {
      const latitude = element.lat ?? element.center?.lat;
      const longitude = element.lon ?? element.center?.lon;
      if (!latitude || !longitude || !element.tags?.name) return [];
      const tags = element.tags;
      const kind = tags["animal:wildlife_rehabilitation"] === "yes" || tags.animal_shelter ? "Wildlife care" : "Veterinary care";
      const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean).join(" ");
      return [{ id: `${element.type}-${element.id}`, name: tags.name, kind, latitude, longitude, address: address || undefined, phone: tags.phone || tags["contact:phone"], website: tags.website || tags["contact:website"], distance: distanceMiles(origin, { latitude, longitude }) }];
    }).sort((a, b) => a.distance - b.distance).slice(0, 100);
  });
