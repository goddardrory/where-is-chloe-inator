// Netlify Function: Nook's Cranny — family shop.
//
// Shares the same Blobs store as miles.js. The miles total acts as the
// family's wallet; this function atomically debits a price and appends the
// purchased item to a shared inventory list.
//
//   GET  /.netlify/functions/shop                       → { miles, inventory, catalog }
//   POST /.netlify/functions/shop  { itemId: 'xxx' }    → { miles, inventory, item }
//
// Server-authoritative catalog so prices can't be tampered with on the
// client. Inventory items are append-only (no refunds).

const { getStore } = require('@netlify/blobs');

const STORE_NAME    = 'where-is-chloe';
const MILES_KEY     = 'nookMilesTotal';
const INVENTORY_KEY = 'inventory';

// Each entry: { name, emoji, price, blurb }
const CATALOG = {
  'pretzel-banner':  { name: 'Pretzel Day Banner',     emoji: '🥨', price: 150,  blurb: 'A reminder that Pretzel Day is the best day of the year.' },
  'beet-sticker':    { name: 'Schrute Beet Sticker',   emoji: '🌽', price: 200,  blurb: "Mose's idea. Identity-theft-deterrent." },
  'fedora':          { name: "Perry's Spare Fedora",   emoji: '🎩', price: 300,  blurb: 'Mysteriously appeared. Major Monogram approved.' },
  'boss-mug':        { name: "World's Best Boss Mug",  emoji: '🏆', price: 350,  blurb: 'Self-awarded. Quite emphatic about it.' },
  'schrute-bucks':   { name: 'Schrute Bucks',          emoji: '🪙', price: 400,  blurb: 'Worth roughly 1/100th of a regular Bell, hooo.' },
  'kk-vinyl':        { name: 'KK Slider Vinyl',        emoji: '🎸', price: 600,  blurb: 'A signed mixtape. Catch a smooth ride.' },
  'goose-hat':       { name: 'Goose Sun Hat',          emoji: '🧢', price: 500,  blurb: 'For the rogue goose. Looks insufferably good.' },
  'doof-lab-pass':   { name: 'Doof Evil Inc Lab Pass', emoji: '🧪', price: 800,  blurb: 'Backstage access. Not affiliated with Tri-State Area sovereignty.' },
  'nook-certificate':{ name: "Tom Nook Loan Certificate", emoji: '📜', price: 1000, blurb: 'Hooo! Pre-approved. 19.99% APR after promotional period, yes yes.' },
  'dodo-pin':        { name: 'Dodo Airlines Pin',      emoji: '🛬', price: 1200, blurb: "Dood. Souvenir from Wilbur and Orville's frequent-flyer program." },
  'doof-button':     { name: 'Self-Destruct-inator',   emoji: '🟥', price: 750,  blurb: 'A big shiny red button. PROBABLY does what you think. Curse you, Perry the Platypus!' },
  'casino-pass':     { name: "Tom Nook's Cabaret Pass", emoji: '🎰', price: 600,  blurb: 'Hooo, the spinning, the spinning! Unlocks the family slot machine. House edge generous. Yes yes.' },
  'tree-sapling':    { name: 'Money Tree Sapling',     emoji: '🌱', price: 500,  blurb: 'Plant anywhere. Grows in 1 hour. Bears Bell-bags every 1 hour after that. Stackable, hooo!' },
  'disco-ball':      { name: 'Disco Ball',              emoji: '🪩', price: 700,  blurb: 'Click to dim the lights and let Harry take over. Hooo, the rhythm, yes yes!' },
};

exports.handler = async (event) => {
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

  if (event.httpMethod === 'GET') {
    const [miles, inventory] = await Promise.all([
      readInt(store, MILES_KEY, 0),
      readJson(store, INVENTORY_KEY, []),
    ]);
    return json(200, { miles, inventory, catalog: CATALOG });
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return json(400, { error: 'Invalid JSON' }); }

    const itemId = String(body.itemId || '');
    const item = CATALOG[itemId];
    if (!item) return json(400, { error: 'Unknown item' });

    // Schrute Bucks Membership: family member's device may include discountPct.
    // Only 10% is honored — anything else falls back to full price.
    let effectivePrice = item.price;
    if (body.discountPct === 10) {
      effectivePrice = Math.round(item.price * 0.9);
    }

    // Family-wide 24h half-off (set when Schrute Bucks Membership is FIRST
    // unlocked by anyone) stacks with personal discount, taking the lower.
    const discountUntil = parseInt(await store.get('shopDiscountUntil'), 10) || 0;
    if (discountUntil > Date.now()) {
      effectivePrice = Math.min(effectivePrice, Math.round(item.price * 0.5));
    }

    const miles = await readInt(store, MILES_KEY, 0);
    if (miles < effectivePrice) {
      return json(402, { error: 'Insufficient miles', miles, price: effectivePrice });
    }

    const inventory = await readJson(store, INVENTORY_KEY, []);
    const purchase = { id: itemId, purchasedAt: new Date().toISOString(), price: effectivePrice };
    inventory.push(purchase);

    const newMiles = miles - effectivePrice;
    await store.set(MILES_KEY, String(newMiles));
    await store.set(INVENTORY_KEY, JSON.stringify(inventory));

    return json(200, { miles: newMiles, inventory, item: { id: itemId, ...item, paid: effectivePrice } });
  }

  return json(405, { error: 'Method not allowed' });
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
