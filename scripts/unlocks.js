// Per-device unlock state for Doof self-destruct small rewards.
//
// Each family member's device tracks (a) which small-reward toggles they have
// unlocked from pressing the Self-Destruct-inator and (b) which of those
// they currently have enabled. State is purely local — the family wallet,
// jackpot flags, and inventory live on the server.
//
// Dispatches `unlock-change` CustomEvent on document whenever state mutates,
// so individual unlock-effect modules can start/stop themselves reactively.

const UNLOCKED_KEY = 'whereischloe.unlocks';
const ENABLED_KEY  = 'whereischloe.unlocks.enabled';

// Canonical list — matches the SMALL_REWARDS array in self-destruct.js.
export const SMALL_REWARD_IDS = [
  'beach', 'sparkle', 'geese', 'confetti', 'norm', 'schrute-bucks', 'rocket',
];

export const SMALL_REWARD_META = {
  beach:           { label: 'Backyard Beach Mode',     emoji: '🌴', desc: 'Palm-tree borders + lazy sand drift across the page.' },
  sparkle:         { label: 'Miles Chip Sparkle',      emoji: '✨', desc: 'Gold sparkles around your Nook Miles counter.' },
  geese:           { label: 'Goose Stampede',          emoji: '🪿', desc: 'Goose V-formation marches across every few minutes.' },
  confetti:        { label: 'Confetti Rain',           emoji: '🎉', desc: 'Occasional confetti bursts + a Tom Nook one-liner.' },
  norm:            { label: 'Norm Bot Walkabout',      emoji: '🤖', desc: 'Norm clanks across periodically offering peanuts.' },
  'schrute-bucks': { label: 'Schrute Bucks Membership',emoji: '🪙', desc: '10% off your personal shop purchases.' },
  rocket:          { label: 'Plane Rocket Boost',      emoji: '🚀', desc: 'Chloe\'s plane sprite gets rocket exhaust on YOUR view.' },
};

export function getUnlocked() {
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

export function isUnlocked(id) {
  return getUnlocked().has(id);
}

export function unlock(id) {
  if (!SMALL_REWARD_IDS.includes(id)) return false;
  const owned = getUnlocked();
  if (owned.has(id)) return false;
  owned.add(id);
  saveUnlocked(owned);
  // Auto-enable on first unlock so the user immediately sees the effect.
  setEnabled(id, true);
  emit('unlock', id);
  return true;
}

export function getEnabledMap() {
  try {
    const raw = localStorage.getItem(ENABLED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function isEnabled(id) {
  if (!isUnlocked(id)) return false;
  const map = getEnabledMap();
  return map[id] === true;
}

export function setEnabled(id, on) {
  if (!isUnlocked(id)) return false;
  const map = getEnabledMap();
  map[id] = !!on;
  try { localStorage.setItem(ENABLED_KEY, JSON.stringify(map)); } catch {}
  emit('toggle', id, !!on);
  return true;
}

function saveUnlocked(set) {
  try { localStorage.setItem(UNLOCKED_KEY, JSON.stringify([...set])); } catch {}
}

function emit(kind, id, value) {
  document.dispatchEvent(new CustomEvent('unlock-change', {
    detail: { kind, id, value },
  }));
}
