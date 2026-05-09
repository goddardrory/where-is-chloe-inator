// Persistent Nook Miles bonus tracker + achievement registry.
//
// The hero "Nook Miles" counter shows a base value derived from flight progress
// plus a SHARED bonus tracked across the family on the server (Netlify Blobs).
// Each interaction posts its delta to /.netlify/functions/miles which atomically
// adds it to the running total and returns the new value. localStorage holds
// the latest known shared total so the chip can display instantly while a
// background sync keeps it fresh from the server every 60s.
//
// On every change a `miles-change` event is dispatched on `document` with
// detail = { delta, reason, total } so the hero counter can refresh + flash.

const MILES_KEY = 'whereischloe.bonusMiles';
const ACH_KEY   = 'whereischloe.achievements';
const SYNC_URL  = '/.netlify/functions/miles';

export function getBonusMiles() {
  try {
    const v = parseInt(localStorage.getItem(MILES_KEY) || '0', 10);
    return Number.isFinite(v) ? v : 0;
  } catch { return 0; }
}

function setLocalMiles(total) {
  try { localStorage.setItem(MILES_KEY, String(total)); } catch {}
}

function emitMilesChange(delta, reason, total) {
  document.dispatchEvent(new CustomEvent('miles-change', {
    detail: { delta, reason, total },
  }));
}

export function addMiles(delta, reason = '') {
  // Optimistic local update so the chip feels instant.
  const localNext = getBonusMiles() + delta;
  setLocalMiles(localNext);
  emitMilesChange(delta, reason, localNext);

  // Push the delta to the shared family total. The server response is the
  // authoritative running count — mirror it back so we converge with other
  // devices.
  fetch(SYNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta, reason }),
  })
    .then((r) => (r && r.ok ? r.json() : null))
    .then((data) => {
      if (data && Number.isFinite(data.total)) {
        setLocalMiles(data.total);
        // Only flash if the server total drifted from our optimistic guess.
        if (data.total !== localNext) {
          emitMilesChange(0, 'sync', data.total);
        }
      }
    })
    .catch(() => { /* offline; pick up on next sync */ });

  return localNext;
}

// Wipe the shared family miles total to zero. Used by detonation as a
// dramatic punishment — server total reset atomically.
export function wipeAllMiles(reason = 'wipe') {
  setLocalMiles(0);
  emitMilesChange(0, reason, 0);
  fetch(SYNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wipe: true }),
  }).catch(() => {});
}

// Pull the shared total from the server and mirror it locally. Called on
// init and every 60s in main.js so family members converge on the same
// running count even if multiple devices add at once.
//
// Also dispatches `server-state` with the full payload so other modules
// (immunity shield, tri-state, shop discount) can react without a duplicate
// network request.
export async function syncBonusMiles() {
  try {
    const res = await fetch(SYNC_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const data = await res.json();
    if (Number.isFinite(data.total)) {
      const before = getBonusMiles();
      setLocalMiles(data.total);
      if (data.total !== before) emitMilesChange(0, 'sync', data.total);
    }
    document.dispatchEvent(new CustomEvent('server-state', { detail: data }));
  } catch { /* offline */ }
}

// One-shot achievements: id, label (toast title), miles (reward).
// Returns true if newly earned, false if already in the registry.
export function awardAchievement(id, label, miles = 0) {
  const owned = getOwned();
  if (owned.has(id)) return false;
  owned.add(id);
  saveOwned(owned);
  if (miles) addMiles(miles, label);
  document.dispatchEvent(new CustomEvent('achievement', {
    detail: { id, label, miles },
  }));
  return true;
}

export function hasAchievement(id) {
  return getOwned().has(id);
}

function getOwned() {
  try {
    const raw = localStorage.getItem(ACH_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveOwned(set) {
  try { localStorage.setItem(ACH_KEY, JSON.stringify([...set])); } catch {}
}
