// Netlify Function: plant a Money Tree.
//
// POST /.netlify/functions/tree-plant  { xPct, yPct }
//   → atomically:
//     1. Verify family inventory has at least one `tree-sapling`
//     2. Validate xPct, yPct are sane numbers in [0, 100]
//     3. Hard-remove one sapling from inventory
//     4. Append a new tree { id, xPct, yPct, plantedAt, lastHarvested:null } to `trees` blob
//     5. Return { trees, inventory }

const { getStore } = require('@netlify/blobs');

const STORE_NAME    = 'where-is-chloe';
const TREES_KEY     = 'trees';
const INVENTORY_KEY = 'inventory';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const xPct = numberInRange(body.xPct, 0, 100);
  const yPct = numberInRange(body.yPct, 0, 100);
  if (xPct === null || yPct === null) {
    return json(400, { error: 'xPct and yPct must be in [0,100]' });
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
  const idx = inventory.findIndex((it) => it && it.id === 'tree-sapling');
  if (idx < 0) {
    return json(409, { error: 'No Money Tree Sapling in family inventory' });
  }

  inventory.splice(idx, 1);

  const trees = await readJson(store, TREES_KEY, []);
  const tree = {
    id: 'tree-' + Math.random().toString(36).slice(2, 10),
    xPct,
    yPct,
    plantedAt: new Date().toISOString(),
    lastHarvested: null,
    plantedBy: typeof body.plantedBy === 'string' ? body.plantedBy.slice(0, 30) : null,
  };
  trees.push(tree);

  await store.set(INVENTORY_KEY, JSON.stringify(inventory));
  await store.set(TREES_KEY, JSON.stringify(trees));

  return json(200, { trees, inventory, planted: tree });
};

function numberInRange(v, min, max) {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
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
