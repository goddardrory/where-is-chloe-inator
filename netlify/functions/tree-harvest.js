// Netlify Function: harvest a mature Money Tree.
//
// POST /.netlify/functions/tree-harvest  { id }
//   → atomically:
//     1. Find the tree by id in the `trees` blob
//     2. Verify it is mature (planted ≥ 1h ago AND no harvest within last 1h)
//     3. Roll a random payout in [800, 1500]
//     4. Credit family wallet by payout
//     5. Set lastHarvested = now
//     6. Return { trees, miles, harvested }
//
// Server is the source of truth on stage/timing — clients can render
// whatever, the harvest call enforces the rules.

const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'where-is-chloe';
const TREES_KEY  = 'trees';
const MILES_KEY  = 'nookMilesTotal';

const GROW_MS    = 60 * 60 * 1000;       // 1 hour from plant to first mature
const REGROW_MS  = 60 * 60 * 1000;       // 1 hour between harvests
const PAYOUT_MIN = 800;
const PAYOUT_MAX = 1500;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const id = String(body.id || '');
  if (!id) return json(400, { error: 'Missing id' });

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

  const trees = await readJson(store, TREES_KEY, []);
  const tree = trees.find((t) => t && t.id === id);
  if (!tree) return json(404, { error: 'Tree not found' });

  const now = Date.now();
  const plantedMs = Date.parse(tree.plantedAt);
  if (!Number.isFinite(plantedMs) || now - plantedMs < GROW_MS) {
    return json(409, { error: 'Tree is not ready yet, hooo' });
  }
  if (tree.lastHarvested) {
    const last = Date.parse(tree.lastHarvested);
    if (Number.isFinite(last) && now - last < REGROW_MS) {
      return json(409, { error: 'Tree is regrowing, hm-hmm' });
    }
  }

  const payout = PAYOUT_MIN + Math.floor(Math.random() * (PAYOUT_MAX - PAYOUT_MIN + 1));
  const miles = await readInt(store, MILES_KEY, 0);
  const newMiles = miles + payout;

  tree.lastHarvested = new Date(now).toISOString();

  await store.set(MILES_KEY, String(newMiles));
  await store.set(TREES_KEY, JSON.stringify(trees));

  return json(200, {
    trees,
    miles: newMiles,
    harvested: { id, payout, at: tree.lastHarvested },
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
