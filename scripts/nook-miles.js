// Persistent Nook Miles bonus tracker + achievement registry.
//
// The hero "Nook Miles" counter shows a base value derived from flight progress
// (300 per landed leg + 500 arrival bonus) plus the bonus tracked here. Bonus
// miles are awarded for interactive moments — goose pets, messages posted,
// easter eggs found, etc. — and SUBTRACTED for detonating the site (humour).
//
// On every change a `miles-change` event is dispatched on `document` with
// detail = { delta, reason, total } so the hero counter can refresh + flash.

const MILES_KEY = 'whereischloe.bonusMiles';
const ACH_KEY   = 'whereischloe.achievements';

export function getBonusMiles() {
  try {
    const v = parseInt(localStorage.getItem(MILES_KEY) || '0', 10);
    return Number.isFinite(v) ? v : 0;
  } catch { return 0; }
}

export function addMiles(delta, reason = '') {
  const next = getBonusMiles() + delta;
  try { localStorage.setItem(MILES_KEY, String(next)); } catch {}
  document.dispatchEvent(new CustomEvent('miles-change', {
    detail: { delta, reason, total: next },
  }));
  return next;
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
