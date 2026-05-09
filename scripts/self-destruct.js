// Doofenshmirtz Self-Destruct-inator client-side trigger.
//
// Renders a bottom-right floating red button when the family inventory
// contains at least one un-pressed `doof-button`. On click, POSTs to the
// server-authoritative roll endpoint and routes the response to the matching
// cinematic.
//
// Server returns one of:
//   - 'detonation'                   → Doof lab explodes, miles wiped
//   - 'detonation-saved'             → shield absorbs the blast, miles preserved
//   - 'small:<id>'                   → personal unlock (or +200 consolation)
//   - 'jackpot:tristate' / 'miles' / 'perry' / 'immunity'
//   - 'consolation:200'              → +200 miles consolation (e.g. immunity stack)
//
// Inventory state is owned by scripts/shop.js — this module listens for the
// `inventory-change` CustomEvent it dispatches.

import { showToast } from './toast.js';
import {
  isUnlocked, unlock, SMALL_REWARD_META,
} from './unlocks.js';
import { playDoofDetonation, playDoofSaved } from './cinematic-doof.js';
import { applyTristate, removeTristate } from './cinematic-tristate.js';
import { playPerryRescue } from './cinematic-perry.js';
import { playMilesJackpot } from './cinematic-jackpot-miles.js';
import { showImmunityShield, removeImmunityShield } from './cinematic-immunity.js';

const URL = '/.netlify/functions/self-destruct';

let buttonCount = 0;
let pressInFlight = false;

export function initSelfDestruct() {
  const btn = document.getElementById('doof-button');
  if (!btn) return;

  btn.addEventListener('click', onPress);

  document.addEventListener('inventory-change', (e) => {
    const inv = e.detail && e.detail.inventory;
    if (!Array.isArray(inv)) return;
    setButtonCount(inv.filter((it) => it && it.id === 'doof-button').length);
  });
}

function setButtonCount(n) {
  buttonCount = n;
  const btn = document.getElementById('doof-button');
  const counter = document.getElementById('doof-button-count');
  if (!btn) return;
  if (n > 0) {
    btn.classList.add('is-armed');
    btn.disabled = false;
    if (counter) {
      counter.textContent = n > 1 ? `×${n}` : '';
      counter.hidden = n <= 1;
    }
  } else {
    btn.classList.remove('is-armed');
    btn.disabled = true;
    if (counter) { counter.textContent = ''; counter.hidden = true; }
  }
}

async function onPress() {
  if (pressInFlight) return;
  if (buttonCount <= 0) return;
  pressInFlight = true;
  const btn = document.getElementById('doof-button');
  if (btn) btn.disabled = true;

  let res, data;
  try {
    res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    data = await res.json();
  } catch (err) {
    showToast('🚫 Network hiccup. -inator stuck. Try again?', 'error');
    pressInFlight = false;
    if (btn) btn.disabled = buttonCount <= 0;
    return;
  }

  if (!res.ok) {
    showToast(`🚫 ${data && data.error ? data.error : 'Roll failed'}`, 'error');
    pressInFlight = false;
    if (btn) btn.disabled = buttonCount <= 0;
    return;
  }

  await routeOutcome(data);

  // Update the button count from server's authoritative inventoryRemaining,
  // and tell shop.js to refresh its local mirror.
  if (typeof data.inventoryRemaining === 'number') {
    setButtonCount(data.inventoryRemaining);
  }
  document.dispatchEvent(new CustomEvent('shop-refresh-requested'));

  // Let any miles listeners (chip, etc.) catch up to the server total.
  if (Number.isFinite(data.miles)) {
    try { localStorage.setItem('whereischloe.bonusMiles', String(data.miles)); } catch {}
    document.dispatchEvent(new CustomEvent('miles-change', {
      detail: { delta: 0, reason: `doof:${data.outcome}`, total: data.miles },
    }));
  }

  pressInFlight = false;
  if (btn) btn.disabled = buttonCount <= 0;
}

async function routeOutcome(data) {
  const outcome = data.outcome;

  if (outcome === 'detonation') {
    await playDoofDetonation();
    showToast("💸 Doof's -inator backfired — miles WIPED.", 'bankruptcy', 3000);
    return;
  }

  if (outcome === 'detonation-saved') {
    await playDoofSaved();
    showToast('🛡️ Immunity token absorbed the blast! Miles safe.', 'success', 3500);
    removeImmunityShield();
    return;
  }

  if (outcome.startsWith('small:')) {
    const id = outcome.slice('small:'.length);
    if (isUnlocked(id)) {
      // Already owned locally — server returned outcome, we treat as consolation.
      // Server didn't add the +200; we POST it ourselves to keep audit trail honest.
      await postConsolation(id);
      const meta = SMALL_REWARD_META[id] || { label: id };
      showToast(`📦 You already own ${meta.label} — +200 miles consolation.`, 'info', 3500);
    } else {
      unlock(id);
      const meta = SMALL_REWARD_META[id] || { label: id };
      const bonusNote = data.bonusFired
        ? (data.bonusFired === 'sparkle' ? ' (+4,500 family miles!)'
           : data.bonusFired === 'schrute-bucks' ? ' (24h family-wide half-off!)'
           : '')
        : '';
      showToast(`✨ UNLOCKED: ${meta.emoji} ${meta.label}${bonusNote} — open ⚙️ Settings to toggle.`, 'success', 5500);
    }
    return;
  }

  if (outcome === 'jackpot:tristate') {
    applyTristate();
    showToast('🟪 TRI-STATE AREA TAKEN OVER! Site flipped until next button press.', 'success', 5000);
    return;
  }

  if (outcome === 'jackpot:miles') {
    await playMilesJackpot();
    showToast('🪙 +5,000 NOOK MILES! Tom Nook is horrified.', 'success', 5000);
    return;
  }

  if (outcome === 'jackpot:perry') {
    await playPerryRescue();
    removeTristate();
    showToast('🕵️ Perry the Platypus saved the day! Active jackpots cleared.', 'success', 4500);
    return;
  }

  if (outcome === 'jackpot:immunity') {
    showImmunityShield();
    showToast('🛡️ IMMUNITY TOKEN granted! Next miles wipe is absorbed.', 'success', 5000);
    return;
  }

  if (outcome === 'consolation:200') {
    const from = data.rolledFrom || 'duplicate';
    showToast(`💰 +200 miles consolation (rolled ${from} — already active).`, 'info', 3500);
    return;
  }

  showToast(`❓ Unknown outcome: ${outcome}`, 'error');
}

async function postConsolation(rewardId) {
  try {
    await fetch('/.netlify/functions/miles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: 200, reason: `consolation:${rewardId}` }),
    });
  } catch { /* fire and forget */ }
}
