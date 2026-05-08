// Netlify Function: shared family Nook Miles counter.
//
// Stores a single integer in Netlify Blobs (built-in KV store). Every device
// posts its delta here and gets back the new running total. The hero chip
// then mirrors that total locally.
//
//   GET  /.netlify/functions/miles            → { total }
//   POST /.netlify/functions/miles {delta:N}  → { total, delta }
//
// Family-scale traffic — race risk on simultaneous writes is low and
// accepted. Sanity-cap delta to ±5,000 so a rogue tab can't DoS the count.

const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'where-is-chloe';
const KEY        = 'nookMilesTotal';
const MAX_DELTA  = 5000;

exports.handler = async (event) => {
  let store;
  try {
    // V1 (legacy) functions don't get auto-context for Blobs — supply the
    // siteID + token explicitly using the env vars we already set for the
    // get-messages function.
    store = getStore({
      name: STORE_NAME,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_FORMS_TOKEN,
    });
  } catch (err) {
    return json(500, { error: 'Blobs unavailable', detail: String(err) });
  }

  if (event.httpMethod === 'GET') {
    const raw = await store.get(KEY);
    const total = toInt(raw, 0);
    return json(200, { total });
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return json(400, { error: 'Invalid JSON' }); }

    const delta = toInt(body.delta, NaN);
    if (!Number.isFinite(delta)) return json(400, { error: 'Invalid delta' });
    if (Math.abs(delta) > MAX_DELTA) {
      return json(400, { error: 'Delta out of range' });
    }

    const current = toInt(await store.get(KEY), 0);
    const next = current + delta;
    await store.set(KEY, String(next));
    return json(200, { total: next, delta });
  }

  return json(405, { error: 'Method not allowed' });
};

function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
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
