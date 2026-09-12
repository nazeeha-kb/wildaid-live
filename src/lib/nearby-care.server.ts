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
    const zoneRadiusKm = 25;
    const radiusMeters = zoneRadiusKm * 1_000;
    const query = `[out:json][timeout:25];(nwr[amenity=veterinary](around:${radiusMeters},${data.latitude},${data.longitude});nwr[healthcare=animal](around:${radiusMeters},${data.latitude},${data.longitude});nwr[healthcare=clinic](around:${radiusMeters},${data.latitude},${data.longitude});nwr[office=veterinarian](around:${radiusMeters},${data.latitude},${data.longitude});nwr[animal_shelter](around:${radiusMeters},${data.latitude},${data.longitude});nwr[amenity=animal_boarding](around:${radiusMeters},${data.latitude},${data.longitude});nwr[shop=pet](around:${radiusMeters},${data.latitude},${data.longitude});nwr["animal:wildlife_rehabilitation"="yes"](around:${radiusMeters},${data.latitude},${data.longitude}););out center tags;`;
    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
    ];
    let elements: Array<{ type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> = [];
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
          body: new URLSearchParams({ data: query }).toString(),
        });
        if (!response.ok) continue;
        const payload = await response.json() as { elements?: typeof elements };
        elements = payload.elements ?? [];
        if (elements.length) break;
      } catch {
        continue;
      }
    }
    if (!elements.length) throw new Error("Nearby care listings are temporarily unavailable.");
    const origin = { latitude: data.latitude, longitude: data.longitude };
    return elements.flatMap((element) => {
      const latitude = element.lat ?? element.center?.lat;
      const longitude = element.lon ?? element.center?.lon;
      if (!latitude || !longitude || !element.tags?.name) return [];
      const tags = element.tags;
      const kind = tags["animal:wildlife_rehabilitation"] === "yes" || tags.animal_shelter ? "Wildlife care" : "Veterinary care";
      const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean).join(" ");
      return [{ id: `${element.type}-${element.id}`, name: tags.name, kind, latitude, longitude, address: address || undefined, phone: tags.phone || tags["contact:phone"], website: tags.website || tags["contact:website"], distance: distanceMiles(origin, { latitude, longitude }) }];
    }).filter((place) => place.distance <= zoneRadiusKm * 0.621371).sort((a, b) => a.distance - b.distance);
  });
