# Doofenshmirtz Self-Destruct Button — Design Spec

**Date:** 2026-05-09
**Project:** WhereIsChloe family flight tracker
**Status:** Approved (iterative chat brainstorm) — ready for plan + implementation

## Goal

A high-stakes, one-shot novelty button purchasable from Nook's Cranny. When pressed, it rolls a server-authoritative weighted RNG with three outcome tiers: most of the time it explodes spectacularly (Doof-themed cinematic + full family miles wipe), sometimes grants the presser a permanent personal cosmetic unlock, and rarely fires a family-wide jackpot.

## Roll mechanic

- **One-shot per purchase.** The Doof button is added to family inventory like any other shop item; pressing consumes the inventory slot and disables that specific instance. Multiple buttons may sit unpressed in inventory simultaneously — each press is independent.
- **Server-authoritative roll.** A new `/.netlify/functions/self-destruct` POST endpoint atomically: verifies an unconsumed Doof button exists in inventory, marks it consumed, rolls the outcome, applies any server-side state changes (miles wipe, jackpot flag, immunity grant, +N miles, etc.), and returns the outcome to the client. Client-side rolling is forbidden — anyone could read source and re-roll until jackpot otherwise.
- **Probability split:** 50% Detonation / 40% Small Reward / 10% Jackpot.

## Outcome tiers

### Detonation (50%) — Doof-themed cinematic
Replaces Resetti for self-destruct fails (Resetti remains exclusive to the existing manual `bomb` easter egg). See cinematic timeline below. Server effect: full family miles wipe via existing `wipe: true` action on `/miles`.

### Small Reward (40%) — Personal Permanent Unlock
Each small reward grants the **pressing family member** a permanent personal unlock, surfaced via a new ⚙️ Settings gear (per-device, localStorage). Once unlocked, that family member can toggle the cosmetic on/off at will.

The 40% slice is split uniformly across the 7 small rewards (~5.71% each). If the rolled small reward is **already unlocked** for this device, the result is converted to a **+200 miles personal consolation** payout instead.

| # | Reward | Toggle behavior | One-shot side-effect (first unlock only) |
|---|---|---|---|
| 1 | **Backyard Beach Mode** | Palm-tree page borders + lazy sand particle drift | — |
| 2 | **Miles Chip Sparkle** | Gold sparkle effect on the miles chip | **+4,500 miles** to family wallet (500 × 9 family members) |
| 3 | **Goose Stampede** | Goose V-formation crosses screen every ~3–5 min | — |
| 4 | **Confetti Rain + Nook line** | Occasional confetti bursts + Tom Nook one-liner ~every 5 min | — |
| 5 | **Norm Bot Walkabout** | Norm clanks across screen ~every 2 min offering peanuts | — |
| 6 | **Schrute Bucks Membership** | 10% off the unlocker's personal shop purchases (cost still drawn from shared wallet, just discounted) | **24h family-wide 50% shop discount** |
| 7 | **Plane Rocket Boost** | Chloe's plane sprite has rocket-exhaust visual on this device only (cosmetic — does NOT alter progress %) | — |

### Jackpot (10%) — Family-wide
The 10% slice is split uniformly across the 4 jackpots (2.5% each).

| # | Jackpot | Effect | Persistence |
|---|---|---|---|
| 8 | **Tri-State Area Takeover** | Site flips upside-down for ALL family members. Doof voice line. Awards "Curse You, Perry" achievement to the winner. | Server-stored `jackpot:active = "tristate"` blob flag. Cleared the next time anyone presses a Doof button (regardless of the new outcome). |
| 9 | **+5,000 Family Miles** | `delta=+5000` to shared wallet. Big fanfare animation. Tom Nook audibly horrified ("Hooo, where did that come from, no no no!"). | One-shot. |
| 11 | **Perry Rescue** | Perry the Platypus zips across the screen. Clears any active server-side jackpot effect (currently: tri-state takeover). Personal toggles untouched. Awards "Hero in a Half-Shell" achievement. | One-shot — but its job IS to clear active jackpots. |
| 12 | **Family Immunity Token** | Glowing 🛡️ shield next to the miles chip, family-shared. Next bombing-or-detonation event consumes the token instead of wiping miles. Awards "Insurance Adjuster" achievement. | Server-stored `jackpot:immunity = 1`. **No stacking** — extra rolls of #12 while a token is active convert to +200 personal consolation. |

> **Note:** Jackpot #10 (KK Slider Concert) was cut during brainstorm.

## Doof Detonation Cinematic

Replaces Resetti for self-destruct fails.

| t | Event |
|---|---|
| 0.0s | Button locks; screen begins to shake (CSS keyframe); Doof voice fires: *"Behold! The Self-Destruct-inator!"* |
| 0.5s | Dark-purple gradient overlay fades in (Doof's lab vibe), `transform-origin` center |
| 0.7s | Doof sprite + -inator appear center-screen, arms-flailing animation |
| 1.2s | Sparks/smoke emoji-particle burst from the -inator (✨💨) |
| 1.8s | BIG flash + 💥 explosion burst, screen-shake amplitude maxes |
| 2.0s | **"CURSE YOU, PERRY THE PLATYPUS!"** audio clip fires |
| 2.5s | Perry silhouette zips off-screen left-to-right with fedora trail (CSS keyframe) |
| 3.0s | Tom Nook animalese scolds: *"Hooo… miles wiped. Yes yes."* |
| 3.5s | Overlay fades, page restored |
| 4.0s | Toast: 💸 *Doof's -inator backfired — miles WIPED.* Server total = 0 |

## Other Cinematic Sketches (lighter touch)

- **Tri-State Takeover:** smooth 1s flip animation (`transform: rotate(180deg)`) on the page wrapper, banner: "I HAVE TAKEN OVER THE TRI-STATE AREA!" + Doof voice. Persists via CSS class on the body driven by a server flag.
- **Perry Rescue:** orange Perry silhouette zooms across, "doo-be-doo-be-doo-bah" jingle, page un-flips smoothly. ~2s total.
- **+5,000 miles:** screen-wide gold-coin shower + Tom Nook scream. Existing miles-chip flash on the +5000 delta.
- **Immunity Granted:** shield 🛡️ flies in and parks next to miles chip. Soft chime.
- **Small reward unlocked:** modal pops with the toggle's name, a preview animation, and "Go to ⚙️ Settings to enable." Awards achievement.

## Settings Gear UX

- New floating ⚙️ button to the **right of the existing 🏪 Shop button**, bottom-left cluster.
- Opens a panel listing all 7 small-reward toggles. Locked items shown greyed with 🔒 + "Press the Doof button to roll for this." Unlocked items get a real toggle switch.
- Per-device localStorage key: `whereischloe.unlocks` (Set of unlock IDs) and `whereischloe.unlocks.enabled` (Map id → bool).
- Per-toggle effects bind into existing render hooks (no full page re-render needed).

## Data Model

### Netlify Blobs (server-side, family-shared)
- Existing: `miles` (int), `inventory` (array of purchased shop items)
- New: `jackpot:active` (string | null) — currently only `"tristate"`
- New: `jackpot:immunity` (int, 0 or 1) — no stacking

### localStorage (client-side, per device)
- Existing: `whereischloe.bonusMiles`, `whereischloe.achievements`
- New: `whereischloe.unlocks` (JSON array of unlocked small-reward IDs)
- New: `whereischloe.unlocks.enabled` (JSON object id → bool)

### Inventory representation
Doof buttons in inventory are tagged. Existing `inventory[]` holds entries like `{ id: "doof-button", boughtAt: "2026-05-09T..." }`. The self-destruct function walks the array and consumes the first entry where `id === "doof-button"`. Marking strategy: `consumed: true` flag (kept for audit), or hard-remove on consume — TBD during impl, leaning toward keeping with `consumed: true` for the sticker row's "I bought one and lived to tell" implication. Actually: hard-remove. The sticker row should reflect what the family currently owns; a press should make the button leave inventory.

## File / Module Layout

```
scripts/
├── self-destruct.js         ← roll trigger, wires the in-page button, calls server
├── cinematic-doof.js        ← exports playDoofDetonation(): Promise<void>
├── cinematic-tristate.js    ← applies/removes upside-down state
├── cinematic-perry.js       ← Perry rescue, clears upside-down
├── cinematic-jackpot-miles.js ← gold coin shower
├── unlocks.js               ← getUnlocked / setUnlocked / isEnabled / setEnabled,
│                              dispatches `unlock-change` event
├── settings-gear.js         ← floating ⚙️ button + modal panel
└── unlock-effects/          ← one module per toggle (beach, sparkle, geese, …)

netlify/functions/
└── self-destruct.js         ← server-authoritative roll endpoint
```

The shop function (existing `netlify/functions/shop.js`) gains a new catalog entry for the Doof button. Price TBD — leaning **750 miles** (between fedora @ 300 and dodo pin @ 1200, but high enough that buying one is a real decision).

## Audio + Sprite Sourcing (hunt list)

- [ ] **"Curse you, Perry the Platypus!"** — myinstants.com (same pattern as TWSS / Animalese clips already in the project)
- [ ] **"Behold! The Self-Destruct-inator!"** — myinstants.com if available, else stitch from another Doof "Behold!" line + the existing Doof clip if there's one
- [ ] **Doof pixel-art PNG** — search itch.io / OpenGameArt / DeviantArt for free-use Phineas & Ferb fan pixel sprites; fall back to a CSS-emoji-only scientist tableau (👨‍🔬⚗️🧪💥) if nothing usable surfaces

## Achievement Additions

- `curse-you-perry` — won Tri-State Takeover
- `hero-in-a-half-shell` — won Perry Rescue
- `insurance-adjuster` — won Immunity Token
- `tom-nook-investor` — won +5,000 jackpot
- `schrute-bucks-member` — unlocked Schrute Bucks Membership (and any of the other 6 small-reward unlocks each get an achievement keyed to the unlock ID)

## Out of Scope

- **Casino feature** (blackjack/roulette betting from the family pool) — explicitly parked per user; saved to project memory.
- **Cross-device sync of personal toggles** — out. Toggles are per-device by design.
- **Tri-State takeover persisting across button purchases** — out. Once cleared by next press, it's cleared.
- **KK Slider Concert jackpot (#10)** — cut during brainstorm.

## Open Implementation TODOs (small, decide during build)

- Final price for the Doof button in shop (leaning 750 miles)
- Inventory consumption strategy (hard-remove confirmed in this doc)
- Roll RNG implementation: `Math.random()` is fine — this is novelty, not security; server-side is sufficient anti-tamper

## User Review

Please review and confirm or request edits before we move to writing the implementation plan.
