// Netlify Function: Doofenshmirtz Self-Destruct-inator — server-authoritative roll.
//
// POST /.netlify/functions/self-destruct  →  { outcome, miles, ... }
//
// Atomic flow:
//   1. Verify the family inventory contains an unconsumed `doof-button`.
//   2. Hard-remove one `doof-button` from inventory.
//   3. Always clear `jackpotActive` (the spec rule: any button press clears
//      a Tri-State Area Takeover).
//   4. Roll a weighted outcome (50% detonation / 40% small reward / 10% jackpot).
//   5. Apply any server-side effects (miles wipe, +5000 family miles,
//      activate Tri-State, grant Immunity, fire one-shot first-unlock bonus).
//   6. Return the outcome to the client. The client handles per-device unlock
//      state for small rewards (server doesn't know which devices have which).

const { getStore } = require('@netlify/blobs');

const STORE_NAME           = 'where-is-chloe';
const MILES_KEY            = 'nookMilesTotal';
const INVENTORY_KEY        = 'inventory';
const JACKPOT_ACTIVE_KEY   = 'jackpotActive';
const JACKPOT_IMMUNITY_KEY = 'jackpotImmunity';
const UNLOCK_BONUSES_KEY   = 'unlockBonusesFired';
const SHOP_DISCOUNT_KEY    = 'shopDiscountUntil';

const DETONATION_PCT = 50;
const SMALL_PCT      = 40;
// JACKPOT_PCT       = 10 (implicit: 100 - 50 - 40)

const SMALL_REWARDS = [
  'beach', 'sparkle', 'geese', 'confetti', 'norm', 'schrute-bucks', 'rocket',
];

const JACKPOTS = ['tristate', 'miles', 'perry', 'immunity'];

// First-time-this-small-reward-is-rolled-by-anyone family-wide bonuses.
const SMALL_BONUS = {
  sparkle:         { milesDelta: 4500 },
  'schrute-bucks': { discount24h: true },
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let store;
  try {
    store = getStore({
      name: STORE_NAME,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_FORMS_TOKEN,
    });
  } catch (err) {
    return json(500, { error: 'Blobs unavailable', detail: String(err) });
  }

  const inventory = await readJson(store, INVENTORY_KEY, []);
  const idx = inventory.findIndex((it) => it && it.id === 'doof-button');
  if (idx < 0) {
    return json(409, { error: 'No Self-Destruct-inator in family inventory' });
  }

  // Consume the button.
  inventory.splice(idx, 1);
  await store.set(INVENTORY_KEY, JSON.stringify(inventory));

  // Snapshot pre-press state and clear active jackpot (any press clears).
  const previousJackpot = (await store.get(JACKPOT_ACTIVE_KEY)) || '';
  await store.set(JACKPOT_ACTIVE_KEY, '');

  let miles    = await readInt(store, MILES_KEY, 0);
  let immunity = await readInt(store, JACKPOT_IMMUNITY_KEY, 0);

  const outcome = roll();
  let returnedOutcome = outcome;
  let activeJackpot = '';
  let bonusFired = null;
  let rolledFrom = null;

  if (outcome === 'detonation') {
    if (immunity >= 1) {
      // Shield absorbs the blast. Miles preserved. Token consumed.
      immunity -= 1;
      await store.set(JACKPOT_IMMUNITY_KEY, String(immunity));
      returnedOutcome = 'detonation-saved';
    } else {
      miles = 0;
      await store.set(MILES_KEY, '0');
    }
  } else if (outcome.startsWith('small:')) {
    const key = outcome.slice('small:'.length);
    const bonusInfo = SMALL_BONUS[key];
    if (bonusInfo) {
      const fired = await readJson(store, UNLOCK_BONUSES_KEY, []);
      if (!fired.includes(key)) {
        if (bonusInfo.milesDelta) {
          miles += bonusInfo.milesDelta;
          await store.set(MILES_KEY, String(miles));
        }
        if (bonusInfo.discount24h) {
          await store.set(SHOP_DISCOUNT_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
        }
        fired.push(key);
        await store.set(UNLOCK_BONUSES_KEY, JSON.stringify(fired));
        bonusFired = key;
      }
    }
  } else if (outcome === 'jackpot:tristate') {
    activeJackpot = 'tristate';
    await store.set(JACKPOT_ACTIVE_KEY, 'tristate');
  } else if (outcome === 'jackpot:miles') {
    miles += 5000;
    await store.set(MILES_KEY, String(miles));
  } else if (outcome === 'jackpot:perry') {
    // Perry already cleared activeJackpot via the unconditional clear above.
    // The cinematic + achievement are the reward.
  } else if (outcome === 'jackpot:immunity') {
    if (immunity >= 1) {
      // Stacking blocked — convert to consolation.
      miles += 200;
      await store.set(MILES_KEY, String(miles));
      returnedOutcome = 'consolation:200';
      rolledFrom = 'jackpot:immunity';
    } else {
      immunity = 1;
      await store.set(JACKPOT_IMMUNITY_KEY, '1');
    }
  }

  return json(200, {
    outcome: returnedOutcome,
    rolledFrom,
    miles,
    immunity,
    activeJackpot,
    previousJackpot: previousJackpot || null,
    bonusFired,
    inventoryRemaining: countDoofButtons(inventory),
  });
};

function roll() {
  const r = Math.random() * 100;
  if (r < DETONATION_PCT) return 'detonation';
  if (r < DETONATION_PCT + SMALL_PCT) {
    const i = Math.floor(Math.random() * SMALL_REWARDS.length);
    return 'small:' + SMALL_REWARDS[i];
  }
  const j = Math.floor(Math.random() * JACKPOTS.length);
  return 'jackpot:' + JACKPOTS[j];
}

function countDoofButtons(inv) {
  return inv.filter((it) => it && it.id === 'doof-button').length;
}

async function readInt(store, key, fallback) {
  const raw = await store.get(key);
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function readJson(store, key, fallback) {
  const raw = await store.get(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
