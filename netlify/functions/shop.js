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

    const miles = await readInt(store, MILES_KEY, 0);
    if (miles < item.price) {
      return json(402, { error: 'Insufficient miles', miles, price: item.price });
    }

    const inventory = await readJson(store, INVENTORY_KEY, []);
    const purchase = { id: itemId, purchasedAt: new Date().toISOString() };
    inventory.push(purchase);

    const newMiles = miles - item.price;
    await store.set(MILES_KEY, String(newMiles));
    await store.set(INVENTORY_KEY, JSON.stringify(inventory));

    return json(200, { miles: newMiles, inventory, item: { id: itemId, ...item } });
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
