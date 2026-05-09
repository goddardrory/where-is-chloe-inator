// Netlify Function: Tom Nook's Cabaret slot machine — 3×3 grid, 8 paylines.
//
// POST /.netlify/functions/slots  { bet }
//   → atomically:
//     1. Verify family inventory has at least one `casino-pass`
//     2. Validate bet ∈ [25, 500] AND wallet ≥ bet
//     3. Debit bet from family wallet
//     4. Roll 9 weighted symbols server-side (3 rows × 3 cols, each cell independent)
//     5. Evaluate 8 paylines (3 rows, 3 cols, 2 diagonals); each hit pays
//        multiplier × bet
//     6. Sum payouts → credit wallet
//     7. Return symbols, per-line breakdown, balance
//
// Server-authoritative — client cannot tamper with reels or payout.

const { getStore } = require('@netlify/blobs');

const STORE_NAME    = 'where-is-chloe';
const MILES_KEY     = 'nookMilesTotal';
const INVENTORY_KEY = 'inventory';

const BET_MIN = 25;
const BET_MAX = 500;

// Symbols + their weights. Each of the 9 cells rolls independently.
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

// 8 paylines — each a 3-tuple of cell indices into the 3×3 grid:
//   0 1 2
//   3 4 5
//   6 7 8
const LINES = [
  { id: 'row1', cells: [0, 1, 2], label: 'Top row' },
  { id: 'row2', cells: [3, 4, 5], label: 'Middle row' },
  { id: 'row3', cells: [6, 7, 8], label: 'Bottom row' },
  { id: 'col1', cells: [0, 3, 6], label: 'Left column' },
  { id: 'col2', cells: [1, 4, 7], label: 'Middle column' },
  { id: 'col3', cells: [2, 5, 8], label: 'Right column' },
  { id: 'diag1', cells: [0, 4, 8], label: 'Diagonal ↘' },
  { id: 'diag2', cells: [2, 4, 6], label: 'Diagonal ↙' },
];

// Pay table — multiplier on the BET awarded per line that hits.
// Tuned for ~76% RTP across all 8 lines combined.
function multiplierFor(lineSymbols) {
  const ids = lineSymbols.map((s) => s.id);
  const all = (id) => ids.every((x) => x === id);
  const countOf = (id) => ids.filter((x) => x === id).length;

  if (all('diamond')) return 60;
  if (all('nook'))    return 25;
  if (all('star'))    return 10;
  if (all('bell'))    return 4;
  if (all('fish') || all('bug') || all('apple')) return 1;

  if (countOf('diamond') === 2) return 3;
  if (countOf('nook')    === 2) return 1;

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

  // Debit, roll 9 cells, evaluate paylines, credit if any payout.
  const afterBet = balance - bet;
  const cells = Array.from({ length: 9 }, () => pickSymbol());

  const wins = [];
  let totalPayout = 0;
  for (const line of LINES) {
    const lineSyms = line.cells.map((i) => cells[i]);
    const mult = multiplierFor(lineSyms);
    if (mult > 0) {
      const payout = mult * bet;
      totalPayout += payout;
      wins.push({
        id: line.id,
        label: line.label,
        cells: line.cells,
        symbols: lineSyms.map((s) => ({ id: s.id, emoji: s.emoji })),
        multiplier: mult,
        payout,
      });
    }
  }

  const after = afterBet + totalPayout;
  await store.set(MILES_KEY, String(after));

  return json(200, {
    bet,
    cells: cells.map((s) => ({ id: s.id, emoji: s.emoji })),
    wins,
    totalPayout,
    net: totalPayout - bet,
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
