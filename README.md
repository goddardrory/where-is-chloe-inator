# Where Is Chloe?

A small, family-only website that tracks Chloe's three-flight journey from
Seattle to Durban (8–10 May 2026). Animal Crossing aesthetic, narrated by
Tom Nook, with cameos from ducks, Perry the Platypus, and The Office.

**Note on the live map:** the original spec called for an embedded FlightAware
iframe, but every major flight tracker (FlightAware, FR24, Flightera) sends
`X-Frame-Options: SAMEORIGIN` and refuses to be embedded. The site instead
renders a custom AC-style tracker card with an animated plane along an SVG
arc, plus a prominent "Open Live Tracker →" button that opens the canonical
FlightAware page in a new tab. This is more reliable than the iframe approach
and looks more on-brand.

Design spec: [`docs/superpowers/specs/2026-05-08-where-is-chloe-design.md`](docs/superpowers/specs/2026-05-08-where-is-chloe-design.md)

## What you need to update before deploying

These are unavoidable manual steps. Do them in order.

### 1. Confirm the flight times

Open [`data/flights.js`](data/flights.js) and update each flight's `dep.iso`
and `arr.iso` to the **exact** scheduled times from Chloe's boarding passes.

Format is ISO 8601 with timezone offset, e.g. `2026-05-08T06:30:00-07:00`.

The placeholder values in the file are reasonable guesses for AS0022 / EK0204 /
EK0775 in May 2026 — the journey will *probably* look right out of the box,
but boarding-pass-accurate is better.

### 2. (Optional) Drop in audio files

Drop these MP3 files into `assets/audio/` if you have them. If they're absent
the site falls back to synthesised beeps via the Web Audio API — the page still
works, just less iconic.

| File | What plays it |
|------|---------------|
| `perryyy.mp3`     | Click the floating Perry button (bottom-right) |
| `perry-theme.mp3` | Konami code; landing in Durban |
| `quack.mp3`       | Click the rogue duck that waddles past every few minutes |
| `kk-airline.mp3`  | Toggle the music button while in-flight |

### 3. (Optional) Add a photo of Chloe

Drop her photo into `assets/img/chloe.jpg` (or `.png`). It isn't wired into
the page yet — once you've added one, mention it and I'll wire it into the
hero band as a small avatar next to Tom Nook's bubble. Leaving this for a
follow-up so the build doesn't block on it.

## Running locally

No build step. Just serve the directory.

```bash
# Python (already on most Macs/Linux):
python3 -m http.server 8080

# or Node:
npx --yes serve -l 8080 .
```

Then open <http://localhost:8080>. The Netlify Function won't be available
locally — the message wall will appear empty in dev. Deploy to Netlify to see
it end-to-end.

## Deploying

1. Push the repo to GitHub (`git remote add origin …`, then `git push -u origin main`).
2. In Netlify: **Add new site → Import from GitHub → select repo**.
3. Build settings: leave blank (the `netlify.toml` handles everything). Publish
   directory `.`, no build command, functions directory `netlify/functions`.
4. Once the first deploy is live, get a **Netlify personal access token**
   from <https://app.netlify.com/user/applications#personal-access-tokens>
   (any scope works for read).
5. In your site → **Site configuration → Environment variables**, add:
   - `NETLIFY_FORMS_TOKEN` = the token from step 4
   - `NETLIFY_SITE_ID` = your site ID (visible in **Site configuration → Site details**)
6. Trigger a redeploy so the function picks up the env vars.
7. Submit a test message via the form. Within a minute the feed should refresh
   and show it.

## Tweaking the personality

- **Office quotes / duck facts / Schrute facts / Perry agent log / AC wisdom** —
  edit the arrays in [`scripts/trivia.js`](scripts/trivia.js).
- **Tom Nook lines** — edit [`scripts/nook-narrator.js`](scripts/nook-narrator.js).
- **Easter egg behaviour** — edit [`scripts/easter-eggs.js`](scripts/easter-eggs.js).
- **Visual tuning** — palette and layout in [`styles/main.css`](styles/main.css);
  animations in [`styles/animations.css`](styles/animations.css).

## Hidden interactions (don't tell the family — let them find them)

- Click the **"Where is Chloe?"** title → "Perryyy!" sound
- Click the floating fedora bottom-right → "Perryyy!" sound
- Toggle the green music note → in-flight ambient music (when in-flight)
- Click any duck waddling across the bottom → quack
- Type **`doof`** anywhere on the page → Where-is-Chloe-inator overlay
- **Konami code** (↑ ↑ ↓ ↓ ← → ← → b a) → Perry fedora cursor + theme song

## Third-party credits

- **Animalese** speech synthesis: [animalese.js](https://github.com/Acedio/animalese.js)
  by Josh Simmons (Acedio). Code is MIT-licensed; the `animalese.wav` audio
  sample is licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  Vendor copy lives at `scripts/vendor/animalese/`. This project is not
  affiliated with Nintendo Co., Ltd. Animal Crossing is © Nintendo.
- **Tom Nook character render**: from the [Nookipedia](https://nookipedia.com/wiki/Tom_Nook)
  wiki for visual reference (fan-curated AC reference site).

## File layout

```
where-is-chloe/
├── index.html
├── styles/      main.css, animations.css, responsive.css
├── scripts/     main.js, flight-state.js, nook-narrator.js,
│                countdown.js, easter-eggs.js, audio.js, messages.js,
│                trivia.js, toast.js
├── data/        flights.js  ← UPDATE TIMES HERE
├── assets/      img/, audio/
├── netlify/functions/get-messages.js
├── netlify.toml
└── docs/superpowers/specs/2026-05-08-where-is-chloe-design.md
```
