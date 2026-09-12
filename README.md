# AnimalAid

AnimalAid is a live, location-aware capacity board that shows the public which wildlife care centers currently have room to take in an animal, filtered by species, instead of a static directory.

Core concept

There are two flows in one app:

Public/Caller flow — someone found an animal and needs to know who can help right now.

Rehabber flow — a rehab center updates their live status in one tap from their phone.

The whole point of the app is that status is LIVE. A rehabber toggling "full for mammals" should immediately remove them from the caller's results without a page reload.

Data model

Seed a mock dataset (no real auth/backend needed — use Supabase or local state, whichever is faster) of ~8-10 fictional rehab centers with:

name

lat/lng for each participating center, anywhere in the world

phone number (fake)

species categories they handle: birds, mammals-small (squirrels, opossums, cats, dogs), mammals-medium (raccoons, groundhogs), fawns, reptiles

for EACH species category, a status: open, full, by-appointment

lastUpdated timestamp (so the UI can show "updated 4 min ago")

Screen 1: Public triage flow

A simple, calm, mobile-first flow (this is often used by someone panicking with an animal in a box):

"What kind of animal did you find?" — buttons for the species categories above (with a small icon each).

"What's the situation?" — quick options like "Injured", "Appears healthy / just found", "Orphaned baby", "Hit by car". This step should also show a short reassurance card for the common "actually doesn't need help" cases (e.g. picking a fawn or fledgling triggers a "this may be normal — here's how to tell" tip) BEFORE pushing them to call anyone, since a huge share of calls are unnecessary.

Results: a map plus a list below it, showing only care centers whose status for that species is currently open or by-appointment. When opened, the map requests the user's current location and prioritizes nearby centers by live distance. Location is retained only in the active browser session. Full/closed centers are hidden from the primary list.

If literally nobody nearby is open for that species, show an honest, clear empty state: "No one nearby currently has capacity for raccoons. Statuses update constantly — check back soon, or call [state wildlife hotline] for guidance." This "sorry, no capacity" state is the key demo moment — it should look intentional and calm, not like an error.

Each result card shows: name, distance, phone (tap to call), which species they're open for right now, and "updated X min ago."

Screen 2: Rehabber status toggle (the demo trick)

A super simple dashboard (pretend-authenticated, just let them pick their center name from a dropdown — no real signup flow needed for the hackathon):

A grid/list of their species categories, each with a big three-state toggle: Open / Full / By appointment.

Tapping a toggle updates instantly (optimistic UI) and takes under 10 seconds total to update multiple species — this speed is the whole value prop, so make the interaction snappy and satisfying (nice tap animation, no confirm dialogs, no extra taps).

Show "last updated" ticking on their own dashboard too.

The live-update demo effect

This is the most important technical requirement: when a rehabber toggles their status on Screen 2, anyone currently viewing Screen 1's results (in another tab/window) should see the list update without refreshing — either via Supabase realtime subscriptions or simple polling every few seconds. This "watch it change live" moment is the entire hackathon demo, so prioritize it working reliably over any other polish.

Design direction

Warm, calm, trustworthy — this is used by stressed people and tired volunteers, not a flashy consumer app. Think clean typography, soft greens/earth tones, generous whitespace, no dark patterns.

Status colors should be instantly readable at a glance: green = open, red = full, amber = by appointment.

Mobile-first for both flows — rehabbers are updating from their phone between intakes, and callers are often on their phone standing next to the animal.

Explicitly out of scope (don't build)

Real account creation, email verification, or auth for rehabbers — a name-select dropdown is enough for the demo.

Real phone/SMS integration — phone numbers can just be tap-to-call links.

Payment, admin panel, or center onboarding flow.

Real-time geocoding or center onboarding workflows.

Nice-to-have if time allows

A subtle "X centers currently open near you" counter on the landing screen.

A tiny bit of copy acknowledging the broader landscape: something like "Not a replacement for your state wildlife hotline — a live view of who has room right now."

This project was built with [Lovable](https://lovable.dev).

## Server Configuration

Image descriptions are generated server-side with Gemini. Set `GEMINI_API_KEY` and `GEMINI_MODEL` in the deployment environment. Pings are persisted immediately; to email recipients, also configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `APP_URL` with a verified Resend sender domain.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/49423615-57a3-4fd1-a2f6-0ed2256b50a3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
