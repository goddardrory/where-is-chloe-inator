# Shop Interactivity, Tom Nook Loan, and Slot Machine — Design Spec

**Date:** 2026-05-09
**Project:** WhereIsChloe family flight tracker
**Status:** Approved (iterative chat brainstorm) — building now
**Companion:** `2026-05-09-doof-self-destruct-design.md`

## 1. Shop sticker interactivity

Every owned shop item becomes clickable in the sticker row. Each click triggers a defined effect.

| Item | Effect | Audio |
|---|---|---|
| 🥨 Pretzel Day Banner | TOGGLE: top-of-page Pretzel Day banner shows/hides | (none) |
| 🌽 Schrute Beet Sticker | One-shot: 🚜 tractor sprite drives across screen | `dwight-identity-theft.mp3` |
| 🎩 Perry's Spare Fedora | TOGGLE: cursor becomes 🎩 (same as the Konami easter egg) | `perryyy.mp3` |
| 🏆 World's Best Boss Mug | One-shot: ☕ floats up from sticker | `michael-stay-calm.mp3` |
| 🪙 Schrute Bucks | One-shot: ✨ "+1 Schrute Buck" floats up | `dwight-idiot.mp3` |
| 🎸 KK Slider Vinyl | TOGGLE: kk-airline.mp3 loop on/off | (track itself) |
| 🧢 Goose Sun Hat | One-shot: a hatted-goose walks across | `quack.mp3` (varying pitch) |
| 🧪 Doof Evil Inc Lab Pass | One-shot: existing Doof overlay opens with random -inator line | `doof-jingle.mp3` |
| 📜 Tom Nook Loan Certificate | **Big mechanic** — see §2 below | `michael-bankruptcy.mp3` (~2s after reveal) |
| 🛬 Dodo Airlines Pin | One-shot: airline announcement toast | `boarding-chime.mp3` |
| 🟥 Self-Destruct-inator | (already wired — separate FAB, see Doof spec) | — |

**Purchase audio**: `dwight-buttlicker.mp3` plays on every shop purchase. Exception: Schrute Bucks purchase plays `dwight-idiot.mp3` instead (replaces, does not stack).

**Wiggle**: each sticker subtly wiggles every ~60 seconds (staggered so they don't sync) to advertise interactivity. ~8° rotation, 300ms, eased.

## 2. Tom Nook Loan Certificate

The economic comedy. Click flow:

1. Click 📜 sticker → "Sign here" modal opens with cream-colored official-looking parchment vibe.
2. Below the big "SIGN HERE, HOOO" button: tiny grey fine print most readers will skip.
3. Click sign → small inventory grid lets the family pick **one free item** from the catalog.
4. Allowed picks: any item in the catalog **including another Tom Nook Loan Certificate** (recursion = chaos = good).
5. Excluded picks: the Self-Destruct-inator (already its own ticking-bomb mechanic) — but tweakable.
6. On confirm: server function adds the picked item to family inventory at zero cost, debits 49,800 from the family wallet (wallet permitted to go negative), and consumes the redeemed certificate.
7. Tom Nook full-page overlay slides in: smug Nook portrait + animalese reveal. *"Hooo! Excellent decision, yes yes. Your loan amount is 49,800 Bells. We will simply collect from your future earnings, hm-hmm. Have a wonderful day!"*
8. ~2 seconds after the overlay opens: `michael-bankruptcy.mp3` fires ("I declare BANKRUPTCY!").
9. While `wallet < 0`: a **smug Tom Nook portrait** renders next to the miles chip with the negative balance shown beside it (e.g. *"-47,300"*). Subtle, not screaming.
10. As the family earns miles, `addMiles()` adds positive deltas as normal — the wallet climbs back toward zero. No special repayment math.
11. Once wallet ≥ 0, the smug portrait + negative-balance display vanish.

### Server endpoint
`POST /.netlify/functions/loan-redeem` with body `{ pickedItemId }`:
1. Verify `inventory[]` has at least one `tom-nook-certificate`.
2. Verify pickedItemId is in the catalog and not in the banned-pick set.
3. Atomically: remove one certificate, append the picked item with `purchasedAt: <iso>` and `paid: 0`, decrement miles by 49,800.
4. Return `{ miles, inventory, picked: <item> }`.

The existing `/miles` `MAX_DELTA = 5000` cap stays — only this dedicated endpoint can shovel a -49,800 through.

## 3. Slot Machine — "Tom Nook's Cranny Cabaret"

### Access
New shop item: **🎰 Casino Pass** (price 600 miles, server-shared inventory).
Once the family inventory contains at least one Casino Pass, every family device shows a 🎰 button next to the ⚙️ Settings gear. Family-wide visibility is server-state-driven (the existing `inventory-change` event already covers this).

### Mechanics
- 3 reels with 7 weighted Animal Crossing symbols (see pay table below)
- Bet from shared family wallet, **min 25 / max 500** miles per spin
- Lever sprite to the right of the reels — click OR drag-down ≥60% triggers the spin
- Server-authoritative spin via `POST /.netlify/functions/slots { bet }`:
  1. Verify Casino Pass owned (≥1 in inventory)
  2. Validate bet ∈ [25, 500] AND wallet ≥ bet
  3. Debit bet
  4. Roll 3 weighted symbols server-side
  5. Compute payout (multiplier × bet)
  6. Credit payout if any
  7. Return `{ symbols, multiplier, payout, balance }`
- Reels spin staggered (0.8s, 1.4s, 2.1s) for anticipation; symbols animate then settle to the server-returned ones
- Audio:
  - Lever pull: `slot-lever.mp3`
  - Reels spinning: `slot-spin.mp3` (looped during the staggered animation)
  - Win (any payout > 0): `slot-jackpot.mp3`
  - Loss (payout = 0): `slot-loss.mp3` (womp womp)

### Symbols
| Symbol | Weight |
|---|---|
| 🍎 Apple | 30 |
| 🦋 Bug Net | 22 |
| 🐟 Fish | 22 |
| 🪙 Bell Bag | 14 |
| 🌟 Star Fragment | 7 |
| 🦝 Tom Nook | 4 |
| 💎 Pink Diamond | 1 |

(Total weight: 100. Each reel rolls independently.)

### Pay table
| Combo | Multiplier |
|---|---|
| 3× 💎 | 100× |
| 3× 🦝 | 40× |
| 3× 🌟 | 20× |
| 3× 🪙 | 10× |
| 3× 🐟 / 🦋 / 🍎 (matching) | 4× |
| 2× 💎 (any positions) | 5× |
| 2× 🦝 (any positions) | 2× |
| Anything else | 0 |

(RTP ≈ 89% — fair-feeling losses with occasional big wins.)

## 4. Audio additions

New entries in `scripts/audio.js`:

| Key | Path |
|---|---|
| dwightIdentityTheft | `assets/audio/dwight-identity-theft.mp3` |
| michaelBankruptcy   | `assets/audio/michael-bankruptcy.mp3`   |
| michaelStayCalm     | `assets/audio/michael-stay-calm.mp3`    |
| boardingChime       | `assets/audio/boarding-chime.mp3`       |
| slotJackpot         | `assets/audio/slot-jackpot.mp3`         |
| slotSpin            | `assets/audio/slot-spin.mp3`            |
| slotLever           | `assets/audio/slot-lever.mp3`           |
| slotLoss            | `assets/audio/slot-loss.mp3`            |
| cursePerry          | `assets/audio/curse-perry.mp3`          |
| dwightButtlicker    | `assets/audio/dwight-buttlicker.mp3`    |
| dwightIdiot         | `assets/audio/dwight-idiot.mp3`         |

All play helpers use the existing `tryPlay` pattern with a synth fallback (silent or beep). Files placed by user in `assets/audio/`. Site stays functional if any are missing.

## 5. Build order
1. Audio source registration (so playable handles exist even before files arrive)
2. Casino Pass added to catalog
3. Loan-redeem server function + client modal + smug-Nook portrait
4. Shop sticker interactivity (10 items)
5. Sticker wiggle
6. Slot machine (server + client + lever + audio)
7. Wire-up in main.js + smoke test

## 6. Out of scope (still parked)
- Per-device unlock for Casino Pass (locked to family-wide)
- Multi-line slot pay (1 line only for MVP)
- Loan installment-payment UI (manual via natural earnings only)
