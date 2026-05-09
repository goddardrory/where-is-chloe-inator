// Netlify Function: Tom Nook's Cabaret slot machine.
//
// POST /.netlify/functions/slots  { bet }
//   → atomically:
//     1. Verify family inventory has at least one `casino-pass`
//     2. Validate bet ∈ [25, 500] AND wallet ≥ bet
//     3. Debit bet from family wallet
//     4. Roll 3 weighted symbols server-side
//     5. Compute payout (multiplier × bet)
//     6. Credit payout if any
//     7. Return { symbols, multiplier, payout, balance }
//
// Server-authoritative — client cannot tamper with reels or payout.

const { getStore } = require('@netlify/blobs');

const STORE_NAME    = 'where-is-chloe';
const MILES_KEY     = 'nookMilesTotal';
const INVENTORY_KEY = 'inventory';

const BET_MIN = 25;
const BET_MAX = 500;

// Symbols + their per-reel weights. Each reel rolls independently.
const SYMBOLS = [
  { id: 'apple',   emoji: '🍎', weight: 30 },
  { id: 'bug',     emoji: '🦋', weight: 22 },
  { id: 'fish',    emoji: '🐟', weight: 22 },
  { id: 'bell',    emoji: '🪙', weight: 14 },
  { id: 'star',    emoji: '🌟', weight: 7  },
  { id: 'nook',    emoji: '🦝', weight: 4  },
  { id: 'diamond', emoji: '💎', weight: 1  },
];
const WEIGHT_TOTAL = SYMBOLS.reduce((s, x) => s + x.weight, 0);

// Pay table — multiplier applied to the bet on a hit.
function multiplierFor(symbols) {
  const ids = symbols.map((s) => s.id);
  const all = (id) => ids.every((x) => x === id);
  const countOf = (id) => ids.filter((x) => x === id).length;

  // Three-of-a-kind
  if (all('diamond')) return 100;
  if (all('nook'))    return 40;
  if (all('star'))    return 20;
  if (all('bell'))    return 10;
  if (all('fish') || all('bug') || all('apple')) return 4;

  // Two-of-a-kind on the rare symbols (any positions)
  if (countOf('diamond') === 2) return 5;
  if (countOf('nook')    === 2) return 2;

  return 0;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const bet = parseInt(body.bet, 10);
  if (!Number.isFinite(bet)) return json(400, { error: 'Invalid bet' });
  if (bet < BET_MIN || bet > BET_MAX) {
    return json(400, { error: `Bet must be between ${BET_MIN} and ${BET_MAX}` });
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
  const hasPass = inventory.some((it) => it && it.id === 'casino-pass');
  if (!hasPass) {
    return json(403, { error: "No Casino Pass owned by family — Tom Nook says: 'Hooo, no admittance!'" });
  }

  const balance = await readInt(store, MILES_KEY, 0);
  if (balance < bet) {
    return json(402, { error: 'Insufficient miles for that bet', balance, bet });
  }

  // Debit, roll, then credit if any payout.
  const afterBet = balance - bet;
  const reels = [pickSymbol(), pickSymbol(), pickSymbol()];
  const mult = multiplierFor(reels);
  const payout = mult * bet;
  const after = afterBet + payout;

  await store.set(MILES_KEY, String(after));

  return json(200, {
    bet,
    symbols: reels.map((s) => ({ id: s.id, emoji: s.emoji })),
    multiplier: mult,
    payout,
    net: payout - bet,
    balance: after,
  });
};

function pickSymbol() {
  let r = Math.random() * WEIGHT_TOTAL;
  for (const s of SYMBOLS) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return SYMBOLS[SYMBOLS.length - 1];
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
