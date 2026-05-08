# Where Is Chloe? — Design Spec

**Date:** 2026-05-08
**Author:** Rory (with Claude)
**Status:** Approved, ready for implementation plan

## 1. Purpose

A small, public, mobile-first website that lets the family follow Chloe's three-flight journey from Seattle to Durban over 8–10 May 2026. The site combines an embedded live flight map with a personality-rich, Animal-Crossing-themed wrapper (Tom Nook narrator) layered with the user's recurring jokes (ducks, Perry the Platypus, The Office). It is single-page, deployed on Netlify, and ships fast — total intended lifespan is roughly the duration of the trip.

## 2. Goals & non-goals

### Goals
- **Stunning on mobile and desktop** — primary viewing context is family on phones in a group chat.
- **Live-feeling without a live API** — flight position via free FlightAware embed; everything else (status text, progress, active card) computed from a hardcoded schedule + local clock.
- **Personality-first** — Tom Nook is the narrator; ducks, Perry, Office references appear as easter eggs and cameos throughout.
- **Ship today** — first flight (AS0022 SEA→JFK) departs 2026-05-08. Site must be deployable within hours, not days.
- **Zero ongoing cost** — Netlify free tier, no paid APIs.

### Non-goals
- Push notifications (browser permission friction; family will refresh)
- Real-time backend / websockets (30s polling is sufficient)
- User accounts or auth (public, unguessable URL is sufficient)
- Native app or PWA install flow
- Custom flight data API integration (FlightAware embed handles the live map)
- Internationalisation
- Comprehensive automated test suite (smoke test only, given lifespan)
- Long-term maintenance considerations

## 3. The journey

Three flights, all in 2026:

| # | Flight | From | To | Date |
|---|--------|------|-----|------|
| 1 | AS0022 (Alaska) | SEA Seattle | JFK New York | Fri 8 May |
| 2 | EK0204 (Emirates) | JFK New York | DXB Dubai | Sat 9 May |
| 3 | EK0775 (Emirates) | DXB Dubai | DUR Durban | Sun 10 May |

Exact departure/arrival times (with timezones) to be supplied by Rory during implementation, sourced from Chloe's boarding passes. The schedule is hardcoded into a config file — no flight API needed for status logic.

## 4. Architecture & stack

**Approach:** pure static site, vanilla HTML / CSS / ES modules, no framework, no build step at minimum (Vite optional for dev DX). All client-side except for one tiny Netlify Function to fetch family-message-wall submissions.

```
where-is-chloe/
├── index.html              # single page, semantic, mobile-first
├── styles/
│   ├── main.css            # AC palette, layout, typography
│   ├── animations.css      # duck waddle, leaf fall, plane bob, transitions
│   └── responsive.css      # 640px and 1024px breakpoints
├── scripts/
│   ├── main.js             # entry — wires modules together, kicks off tick
│   ├── flight-state.js     # time-driven status state machine
│   ├── countdown.js        # layover & next-flight countdowns
│   ├── nook-narrator.js    # state → Tom Nook line generator
│   ├── easter-eggs.js      # konami code, perryyy click, rogue duck, doof
│   ├── audio.js            # sound playback helpers (autoplay-safe)
│   └── messages.js         # Netlify Forms submit + fetch from function
├── netlify/functions/
│   └── get-messages.js     # ~30 lines, JS, wraps Netlify Forms API
├── assets/
│   ├── img/                # chloe.jpg, tom-nook.png, ducks, perry, doof, leaves
│   └── audio/              # perryyy.mp3, perry-theme.mp3, quack.mp3, kk-airline.mp3
├── data/
│   └── flights.js          # the 3 flights as a const config
├── netlify.toml            # publish dir + form config
└── README.md
```

**Hosting:** Netlify, connected to GitHub repo, auto-deploy on push to `main`. Default `whereischloe.netlify.app` URL is acceptable; custom domain optional.

**SDLC plugin alignment:** uses only the `vanilla-*` agents from `rust-vanilla-sdlc` (architect, dev, ux, security, docs, debugger). The Netlify Function is JS not Rust, by design — keeps the toolchain to one language and avoids spinning up the Rust half of the SDLC plugin for ~30 lines of code.

## 5. Page anatomy (top to bottom, single-scroll page)

### 5.1 Hero band
- Sky-blue → grass-green vertical gradient, AC palette
- Falling-leaves ambient animation (CSS, respects `prefers-reduced-motion`)
- Title: **"Where is Chloe?"** in playful rounded font (Nunito or similar)
- Tom Nook avatar + speech bubble with **state-aware narration** (see §6.2)
- One-line current status (e.g., "✈️ Cruising over Newfoundland")
- Journey progress bar (0–100% across the whole 3-leg journey) with plane icon at correct position
- Endpoints labeled: SEA on the left, DUR on the right

### 5.2 Live flight tracker
- ~~FlightAware embed iframe~~ **(revised during build: all major trackers send `X-Frame-Options: SAMEORIGIN`, so iframe embedding is impossible without a paid widget license)**
- Replaced with a **stylized tracker card**: AC-themed gradient panel showing departure→arrival pins, an SVG arc with an animated plane icon at the current % position, the active flight number, and a prominent **"Open Live Tracker on FlightAware →"** CTA that opens the canonical tracker page in a new tab
- Card content (focus flight, plane position, CTA URL) updates with every state-machine tick
- Responsive — fills viewport width on mobile, comfortable padding on desktop

### 5.3 Three flight cards
- Stacked AC-style rounded cards with soft drop shadow
- Each card displays:
  - Flight number + airline
  - Departure airport + scheduled departure time
  - Arrival airport + scheduled arrival time
  - Duration
  - Status pill: **Pending** (grey) / **In Air** (yellow, pulsing) / **Landed** (green)
  - Nook Miles awarded on completion: **300 per leg** (revealed when status flips to Landed)
- The currently-active card has a subtle pulsing border + light tint background
- A "Nook Miles total" chip lives near the journey progress bar in the hero. Math: 300 × 3 legs + 500 arrival bonus = 1,400 total possible.

### 5.4 Layover countdown
- **Conditionally rendered** only when state is `layover`
- Big timer (HH:MM:SS) counting down to next departure
- Pretzel Day banner styling (orange/yellow Office reference)
- Tom Nook line: "Resting at [airport]. Loan repayment unaffected."

### 5.5 Family message wall
- Submission form: name (required, max 40), message (required, max 280)
- Honeypot bot-field for spam protection
- On submit: POST to Netlify Forms, optimistic UI update, "Hooo! Message delivered, yes yes" toast
- Feed: leaf-shaped cards, newest first, name + message + relative time
- Auto-refresh every 60s while page is open

### 5.6 Trivia ticker (footer)
- Rotates every 8 seconds through five categories (random pick weighted equally):
  1. Schrute Facts ("Bears. Beets. Boeings.")
  2. Real duck facts ("Ducks have three eyelids.")
  3. Perry agent log entries ("0900: Agent C boarded. Doof status: foiled.")
  4. AC villager wisdom ("A journey of a thousand miles starts with one Nook Miles task, hooo.")
  5. Office quotes ("Planes are like buses, but they fly. — Kevin, probably.")
- Content lives in a JS array per category, edited inline; final list curated with Rory during implementation

### 5.7 Floating audio control
- Bottom-right small Perry fedora icon
- Click → plays "Perryyy!" sound; second click within 2s → plays Perry theme song
- A small toggle inside the same control mutes/unmutes the ambient KK Slider airline theme during in-flight states (the toggle is always visible — no hidden long-press gesture, since those don't translate cleanly to desktop)

## 6. Flight status state machine

### 6.1 States

The state at any moment is computed from `now` (user's local clock) compared against the hardcoded schedule. No network call required.

| State | Condition | Active flight |
|-------|-----------|--------------|
| `pre-trip` | `now < flights[0].dep` | none |
| `in-flight` | `flights[i].dep ≤ now < flights[i].arr` | flight `i` |
| `layover` | `flights[i].arr ≤ now < flights[i+1].dep` | none (between `i` and `i+1`) |
| `arrived` | `now ≥ flights[2].arr` | none |

A tick runs every 30 seconds: re-computes state, updates DOM if state changed, refreshes countdown timers.

### 6.2 State → narration mapping

| State | Hero copy | Tom Nook line |
|-------|-----------|---------------|
| `pre-trip` | "Departure in {countdown}" | "Hooo! Chloe's expedition begins soon, yes yes." |
| `in-flight` | "✈️ Cruising over {region}" | "Currently soaring above {region}, hm-hmm." |
| `layover` | "On the ground at {airport}" | "Resting at {airport}. Loan repayment unaffected." |
| `arrived` | "🇿🇦 Safely in Durban" | "Welcome to Durban, traveler! 1,400 Nook Miles earned, yes yes." |

`{region}` is a static lookup table mapping `(flight, % through flight)` to a poetic location ("Greenland", "the Sahara", "the Indian Ocean") — manually curated, not geocoded.

### 6.3 Progress bar math

- Each leg contributes a fixed weight to total progress (proportional to flight duration, rounded for clean numbers — e.g., 15% / 50% / 35%).
- Within the active leg, partial progress = `(now - leg.dep) / (leg.arr - leg.dep)` clamped to `[0, 1]`.
- Total = (sum of completed legs' weights) + (active leg weight × partial progress).

### 6.4 Status-change toasts (one-time, per state transition)

- Any flight delays past scheduled time → "I DECLARE BANKRUPTCY!" overlay with Michael Scott image (manual trigger initially; can wire to FlightAware delay if time permits, otherwise out of scope)
- Layover starts → Pretzel Day banner slides in
- Final landing → Confetti + KK Slider strums + "Welcome to Durban, traveler" overlay

## 7. Personality features (full catalog)

### 7.1 Tom Nook narrator
Central. State-aware lines (§6.2). Avatar is a stylised raccoon image (sourced openly or commissioned simple line art). Speech bubble styling matches AC dialogue boxes — cream background, rounded, slight wobble animation.

### 7.2 Sound effects (all opt-in, autoplay-safe)
- `perryyy.mp3` — plays on Perry icon click; also random 1-in-20 chance on logo click
- `perry-theme.mp3` — plays on `arrived` state transition; hidden trigger via Konami code
- `quack.mp3` — plays on rogue-duck click
- `kk-airline.mp3` — looping low-volume during `in-flight`; muted by default with toggle in floating audio control

### 7.3 Visual easter eggs
- **Rogue duck** — emoji 🦆 waddles across bottom of viewport every ~3 minutes via CSS keyframe animation; clickable to quack; respects `prefers-reduced-motion`
- **Falling leaves** — ambient on hero band; 8–12 leaves drifting at varied speeds; CSS-only
- **Konami code** (↑↑↓↓←→←→BA) — cursor becomes Perry's fedora image; triggers Perry theme; trivia ticker swaps to villager-only mode
- **Doofenshmirtz "Where-is-Chloe-inator"** — typing the literal string `doof` anywhere on the page triggers a 5-second cutscene overlay (Doof image + "BEHOLD! THE WHERE-IS-CHLOE-INATOR!")
- **"Perryyyy!"** — click site logo → plays sound + visual zoom on Perry icon

### 7.4 Open content questions for implementation
- Which Office quotes specifically (Rory to curate ~10)
- Which AC villagers Chloe loves (cameo opportunities in the ticker / message-wall avatars)
- Tom Nook image source (free clipart vs commissioned vs internal sketch)
- Photo of Chloe for hero band
- Tone for status-change toasts (more sincere vs more chaotic)

## 8. Family message wall

### 8.1 Submit
- HTML `<form name="messages" data-netlify="true" netlify-honeypot="bot-field">`
- Fields: `name` (text, required, maxlength 40), `message` (textarea, required, maxlength 280)
- `bot-field` is a hidden text input — submissions where it's filled are silently dropped by Netlify
- On submit success: form clears, toast appears, feed re-fetches
- On submit error: error toast with retry

### 8.2 Display (Netlify Function: `get-messages`)
- Tiny serverless function in `netlify/functions/get-messages.js`
- Calls Netlify's Forms API using a token stored in Netlify env vars
- Returns approved submissions as JSON, newest first, capped at 50
- Frontend fetches on page load and every 60 seconds
- Feed renders each as a leaf-shaped card with name, message, and relative time ("2 minutes ago")

### 8.3 Anti-spam
- Netlify built-in honeypot (above)
- Netlify built-in Akismet-style filter (free tier)
- 280-char hard cap, no HTML allowed (text-only `textContent` rendering, never `innerHTML`)

## 9. Responsive design

Mobile-first CSS. Breakpoints at **640px** and **1024px**.

| Viewport | Layout |
|----------|--------|
| `< 640px` (mobile) | Single column. Hero ~55vh. Map full width. Cards stack. Ticker shows one fact at a time. Audio button bottom-right, thumb-reachable. |
| `640px – 1023px` (tablet) | Hero full width. Two-column for map + active flight card. Cards stack below. Ticker shows two facts. |
| `≥ 1024px` (desktop) | Hero full width. Two-column section: map left 60%, flight cards right 40%. Message wall full width below. |

**Performance budget:**
- LCP target < 1.5s on 4G mobile
- All images compressed and served as WebP via `<picture>` with PNG/JPG fallback
- Audio lazy-loaded on first user interaction (autoplay-policy compliant)
- No external fonts (Nunito or similar self-hosted, subset to Latin)
- All scripts deferred or modules

**Accessibility:**
- Semantic HTML (`<main>`, `<section>`, `<article>` for cards)
- Alt text on all imagery (Tom Nook gets a real alt: "Tom Nook, raccoon shopkeeper from Animal Crossing")
- Keyboard navigation works for easter eggs (Konami works without mouse)
- `prefers-reduced-motion` disables: rogue duck, falling leaves, pulsing card border, status-change confetti
- Color contrast meets WCAG AA against AC palette

## 10. Security & privacy

- Public site, public data, no auth — but the URL is unguessable enough not to be indexed (don't add to sitemap, don't link from anywhere public)
- `noindex` meta tag to deter search engines
- Message wall: text-only rendering (no `innerHTML`), Netlify spam filtering, 280-char cap
- No personal data beyond Chloe's first name, photo (with her consent), and family members' chosen display names in messages
- HTTPS automatic via Netlify
- No third-party analytics or trackers

## 11. Testing strategy

Given the 3-day lifespan, automated testing is intentionally minimal.

- **Manual smoke test before deploy:**
  - Each state of the state machine renders correctly (force `now` via dev tool / temporary override)
  - Mobile (DevTools iPhone view) and desktop layouts render
  - Message wall submit + display round-trip works in the deployed environment
  - All easter eggs trigger
  - All audio plays after first interaction
  - `prefers-reduced-motion` disables animations
- **One end-to-end smoke test** (Playwright — matches the SDLC plugin's existing test toolchain) that loads the deployed page and asserts the page title, a Tom Nook line, and the three flight cards appear
- No unit tests beyond what `vanilla-dev` writes naturally for `flight-state.js` (state machine has clear input/output and is the highest-risk piece of logic)

## 12. Deployment

1. Local development: open `index.html` directly, or run a static server (`python -m http.server` or Vite if added)
2. Push to GitHub repo `where-is-chloe`
3. Netlify "Add new site → Import from GitHub" → select repo
4. Build settings: publish directory = `.` (or `dist/` if Vite is used), no build command (or `npm run build` if Vite)
5. Netlify auto-detects `netlify.toml` and the `data-netlify` form attribute
6. Set env var `NETLIFY_FORMS_TOKEN` for the `get-messages` function (Netlify personal access token, scoped to forms read)
7. Site live at `https://<chosen-subdomain>.netlify.app`

## 13. Open questions (must be answered during implementation)

| # | Question | Owner |
|---|----------|-------|
| 1 | Exact departure/arrival times with timezones for all 3 flights | Rory (boarding passes) |
| 2 | Photo of Chloe for hero band | Rory |
| 3 | Curated list of ~10 Office quotes | Rory |
| 4 | AC villagers Chloe loves (for cameos) | Rory |
| 5 | Custom domain or default `*.netlify.app`? | Rory |
| 6 | Tom Nook image source (free clipart vs sketch) | Rory + dev-agent |

## 14. Out of scope (explicit)

- Push notifications
- Real-time backend / websockets
- User accounts / auth
- Native app or PWA
- Custom flight data API integration
- Internationalisation
- Long-term maintenance / monitoring
- Comprehensive test suite
- Analytics / observability
- Multi-traveller support (this is for Chloe, this trip, only)
