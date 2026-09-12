export type Species = "birds" | "mammals_small" | "mammals_medium" | "fawns" | "reptiles";
export type Status = "open" | "full" | "by_appointment";

export const SPECIES: {
  id: Species;
  label: string;
  examples: string;
  emoji: string;
  plural: string;
}[] = [
  { id: "birds", label: "Bird", examples: "songbirds, hawks, geese", emoji: "🐦", plural: "birds" },
  {
    id: "mammals_small",
    label: "Small mammal",
    examples: "squirrels, opossums, cats, dogs, chipmunks",
    emoji: "🐿️",
    plural: "small mammals",
  },
  {
    id: "mammals_medium",
    label: "Medium mammal",
    examples: "raccoons, groundhogs, foxes",
    emoji: "🦝",
    plural: "raccoons and groundhogs",
  },
  { id: "fawns", label: "Fawn", examples: "baby deer", emoji: "🦌", plural: "fawns" },
  {
    id: "reptiles",
    label: "Reptile",
    examples: "turtles, snakes",
    emoji: "🐢",
    plural: "reptiles",
  },
];

export const SITUATIONS = [
  { id: "injured", label: "Injured", hint: "Visible wound, limping, bleeding" },
  { id: "healthy", label: "Appears healthy / just found", hint: "Alert, no obvious injury" },
  { id: "orphaned", label: "Orphaned baby", hint: "No parent seen nearby" },
  { id: "car", label: "Hit by car", hint: "Found on or beside a road" },
] as const;

export type SituationId = (typeof SITUATIONS)[number]["id"];

export const STATUS_META: Record<
  Status,
  { label: string; short: string; text: string; bg: string; dot: string }
> = {
  open: {
    label: "Open",
    short: "Taking intakes",
    text: "text-open",
    bg: "bg-open-soft",
    dot: "bg-open",
  },
  by_appointment: {
    label: "By appointment",
    short: "Call first",
    text: "text-appt",
    bg: "bg-appt-soft",
    dot: "bg-appt",
  },
  full: {
    label: "Full",
    short: "At capacity",
    text: "text-full",
    bg: "bg-full-soft",
    dot: "bg-full",
  },
};

export type Coordinates = { latitude: number; longitude: number };

export function distanceMiles(from: Coordinates, to: Coordinates) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function timeAgo(iso: string, now: number = Date.now()) {
  const secs = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs} sec ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Species/situation combos where the animal usually does NOT need rescuing. */
export function reassurance(species: Species, situation: SituationId) {
  if (species === "fawns" && (situation === "healthy" || situation === "orphaned")) {
    return {
      title: "A fawn alone is usually fine",
      body: "Does leave fawns hidden for hours at a time and only return a few times a day. A curled-up, quiet fawn with no flies, wounds or fly eggs is almost certainly waiting for mom.",
      signs: [
        "Lying quietly, ears up, no visible injury — leave it alone",
        "Wandering and crying all day, covered in flies or ants — it needs help",
        "Watch from a distance or a window for 8-10 hours before intervening",
      ],
    };
  }
  if (species === "birds" && (situation === "healthy" || situation === "orphaned")) {
    return {
      title: "This may be a fledgling, not an orphan",
      body: "Young birds spend several days hopping on the ground while learning to fly. The parents are usually nearby and still feeding it.",
      signs: [
        "Feathered, hopping, upright — normal, keep pets indoors and leave it",
        "Naked or downy and out of the nest — place it back in the nest if you can reach it",
        "Drooping wing, blood, or cat contact — it needs a rehabber",
      ],
    };
  }
  if (species === "mammals_small" && situation === "healthy") {
    return {
      title: "Check for a parent before you move it",
      body: "Squirrel and opossum mothers routinely retrieve dropped young. A warm, uninjured baby left near the tree base is often collected within a few hours.",
      signs: [
        "Uninjured and warm — give the mother a few daylight hours",
        "Cold, bleeding, or fly eggs present — call a rehabber now",
        "Opossums longer than 7 inches (body only) are independent",
      ],
    };
  }
  return null;
}

export const WILDLIFE_GUIDANCE = "Contact your local licensed wildlife authority for immediate guidance.";
export const STATE_HOTLINE = { label: "Local wildlife authority", phone: "" };
