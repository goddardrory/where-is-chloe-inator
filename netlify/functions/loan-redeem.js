// Netlify Function: Tom Nook Loan Certificate redemption.
//
// POST /.netlify/functions/loan-redeem  { pickedItemId: 'xxx' }
//   → atomically:
//     1. Verify family inventory has at least one `nook-certificate`
//     2. Validate pickedItemId is a real catalog entry, not in BANNED_PICKS
//     3. Hard-remove one nook-certificate from inventory
//     4. Append the picked item to inventory at `paid: 0`
//     5. Decrement family wallet by 49,800 (allowed to go negative)
//     6. Return { miles, inventory, picked }
//
// The existing `/miles` endpoint caps deltas at ±5,000 to prevent rogue tabs
// from DoS-ing the wallet. This dedicated endpoint is the only path that can
// shovel a -49,800 through.

const { getStore } = require('@netlify/blobs');

const STORE_NAME    = 'where-is-chloe';
const MILES_KEY     = 'nookMilesTotal';
const INVENTORY_KEY = 'inventory';
const LOAN_AMOUNT   = 49800;

// Mirrors the catalog in shop.js. Kept duplicated to avoid pulling shop.js
// into the function — keeps redeploys atomic per-function.
const CATALOG = {
  'pretzel-banner':  { name: 'Pretzel Day Banner',        emoji: '🥨' },
  'beet-sticker':    { name: 'Schrute Beet Sticker',      emoji: '🌽' },
  'fedora':          { name: "Perry's Spare Fedora",      emoji: '🎩' },
  'boss-mug':        { name: "World's Best Boss Mug",     emoji: '🏆' },
  'schrute-bucks':   { name: 'Schrute Bucks',             emoji: '🪙' },
  'kk-vinyl':        { name: 'KK Slider Vinyl',           emoji: '🎸' },
  'goose-hat':       { name: 'Goose Sun Hat',             emoji: '🧢' },
  'doof-lab-pass':   { name: 'Doof Evil Inc Lab Pass',    emoji: '🧪' },
  'nook-certificate':{ name: 'Tom Nook Loan Certificate', emoji: '📜' },
  'dodo-pin':        { name: 'Dodo Airlines Pin',         emoji: '🛬' },
  'doof-button':     { name: 'Self-Destruct-inator',      emoji: '🟥' },
  'casino-pass':     { name: "Tom Nook's Cabaret Pass",   emoji: '🎰' },
};

// Items the loan certificate can NOT be redeemed for. Per design intent the
// recursive 'nook-certificate' pick IS allowed (chaos), but the Self-
// Destruct-inator is excluded since it's already its own ticking-bomb mechanic.
const BANNED_PICKS = new Set(['doof-button']);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const pickedItemId = String(body.pickedItemId || '');
  if (!CATALOG[pickedItemId]) return json(400, { error: 'Unknown item' });
  if (BANNED_PICKS.has(pickedItemId)) {
    return json(400, { error: 'Cannot redeem certificate for that item' });
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
  const certIdx = inventory.findIndex((it) => it && it.id === 'nook-certificate');
  if (certIdx < 0) {
    return json(409, { error: 'No Tom Nook Loan Certificate in family inventory' });
  }

  inventory.splice(certIdx, 1);
  inventory.push({
    id: pickedItemId,
    purchasedAt: new Date().toISOString(),
    paid: 0,
    via: 'loan-redeem',
  });

  const miles = await readInt(store, MILES_KEY, 0);
  const newMiles = miles - LOAN_AMOUNT;

  await store.set(MILES_KEY, String(newMiles));
  await store.set(INVENTORY_KEY, JSON.stringify(inventory));

  return json(200, {
    miles: newMiles,
    inventory,
    picked: { id: pickedItemId, ...CATALOG[pickedItemId] },
    debt: LOAN_AMOUNT,
  });
};

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
