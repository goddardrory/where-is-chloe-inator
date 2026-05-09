// Immunity Token — floating shield 🛡️ next to the miles chip.
//
// Server-state-driven: the shield is shown when the family Immunity Token
// counter is ≥ 1 (returned by /miles GET as `immunity`). Consumed when a
// detonation/wipe is absorbed.

export function showImmunityShield() {
  const el = document.getElementById('immunity-shield');
  if (el) el.hidden = false;
}

export function removeImmunityShield() {
  const el = document.getElementById('immunity-shield');
  if (el) el.hidden = true;
}

export function applyImmunityFromCount(count) {
  if (count >= 1) showImmunityShield();
  else removeImmunityShield();
}
