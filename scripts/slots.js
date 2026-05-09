// Tom Nook's Cabaret — slot machine client.
//
// 3 reels, server-authoritative spin. Bet from the shared family wallet.
// Lever sprite to the right of the reels — click OR drag-down ≥ 60% triggers
// a spin. Reels animate staggered (0.8s, 1.4s, 2.1s) before settling on the
// server-returned symbols.

import { showToast } from './toast.js';
import {
  playSlotLever, playSlotSpin, playSlotJackpot, playSlotLoss,
} from './audio.js';

const URL = '/.netlify/functions/slots';
const REEL_SYMBOLS = ['🍎', '🦋', '🐟', '🪙', '🌟', '🦝', '💎'];

const BET_MIN = 25;
const BET_MAX = 500;
const BET_DEFAULT = 50;

let bet = BET_DEFAULT;
let spinInFlight = false;
let spinAudioInstance = null;

export function initSlots() {
  ensureCasinoButton();
  ensureSlotsModal();
  document.addEventListener('inventory-change', (e) => {
    const inv = e.detail && e.detail.inventory;
    if (Array.isArray(inv)) updateCasinoButtonVisibility(inv);
  });
}

export function openCasino() {
  const modal = document.getElementById('slots-overlay');
  if (!modal) return;
  modal.classList.add('is-open');
  resetReels();
}

function closeCasino() {
  const modal = document.getElementById('slots-overlay');
  if (modal) modal.classList.remove('is-open');
  if (spinAudioInstance) {
    try { spinAudioInstance.pause(); spinAudioInstance.currentTime = 0; } catch {}
    spinAudioInstance = null;
  }
}

// === Casino entry button (next to ⚙️ Settings) ===

function ensureCasinoButton() {
  if (document.getElementById('casino-button')) return;
  const btn = document.createElement('button');
  btn.id = 'casino-button';
  btn.type = 'button';
  btn.className = 'casino-button';
  btn.setAttribute('aria-label', "Open Tom Nook's Cabaret");
  btn.title = "Tom Nook's Cabaret";
  btn.hidden = true;

  const emoji = document.createElement('span');
  emoji.className = 'casino-button-emoji';
  emoji.textContent = '🎰';
  btn.appendChild(emoji);

  btn.addEventListener('click', openCasino);
  document.body.appendChild(btn);
}

function updateCasinoButtonVisibility(inv) {
  const btn = document.getElementById('casino-button');
  if (!btn) return;
  const owned = inv.some((it) => it && it.id === 'casino-pass');
  btn.hidden = !owned;
}

// === Modal ===

function ensureSlotsModal() {
  if (document.getElementById('slots-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'slots-overlay';
  overlay.className = 'slots-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', "Tom Nook's Cabaret slot machine");

  const cabinet = document.createElement('div');
  cabinet.className = 'slots-cabinet';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'slots-close';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', closeCasino);
  cabinet.appendChild(closeBtn);

  const header = document.createElement('div');
  header.className = 'slots-header';
  const eyebrow = document.createElement('div');
  eyebrow.className = 'slots-eyebrow';
  eyebrow.textContent = "TOM NOOK'S CABARET";
  header.appendChild(eyebrow);
  const title = document.createElement('h2');
  title.className = 'slots-title';
  title.textContent = 'Hooo, the spinning, yes yes!';
  header.appendChild(title);
  cabinet.appendChild(header);

  // Reels + lever row
  const playArea = document.createElement('div');
  playArea.className = 'slots-play-area';

  const reelsBox = document.createElement('div');
  reelsBox.className = 'slots-reels';
  for (let i = 0; i < 3; i++) {
    const reel = document.createElement('div');
    reel.className = 'slots-reel';
    reel.id = `slots-reel-${i}`;
    const inner = document.createElement('div');
    inner.className = 'slots-reel-inner';
    inner.id = `slots-reel-inner-${i}`;
    inner.textContent = '❓';
    reel.appendChild(inner);
    reelsBox.appendChild(reel);
  }
  playArea.appendChild(reelsBox);

  // Lever
  const leverBox = document.createElement('div');
  leverBox.className = 'slots-lever-box';
  const lever = document.createElement('button');
  lever.id = 'slots-lever';
  lever.type = 'button';
  lever.className = 'slots-lever';
  lever.setAttribute('aria-label', 'Pull the lever');

  const leverHandle = document.createElement('div');
  leverHandle.className = 'slots-lever-handle';
  leverHandle.textContent = '🔴';
  lever.appendChild(leverHandle);

  lever.addEventListener('click', spin);
  attachLeverDrag(lever, leverHandle);
  leverBox.appendChild(lever);
  playArea.appendChild(leverBox);

  cabinet.appendChild(playArea);

  // Result line + balance
  const result = document.createElement('div');
  result.className = 'slots-result';
  result.id = 'slots-result';
  result.textContent = 'Place your bet, hooo';
  cabinet.appendChild(result);

  // Bet controls
  const betRow = document.createElement('div');
  betRow.className = 'slots-bet-row';

  const betLabel = document.createElement('label');
  betLabel.className = 'slots-bet-label';
  betLabel.textContent = 'Bet';
  betLabel.htmlFor = 'slots-bet-input';
  betRow.appendChild(betLabel);

  const betDown = document.createElement('button');
  betDown.type = 'button';
  betDown.className = 'slots-bet-step';
  betDown.textContent = '−';
  betDown.addEventListener('click', () => adjustBet(-25));
  betRow.appendChild(betDown);

  const betInput = document.createElement('input');
  betInput.type = 'number';
  betInput.id = 'slots-bet-input';
  betInput.className = 'slots-bet-input';
  betInput.min = String(BET_MIN);
  betInput.max = String(BET_MAX);
  betInput.step = '25';
  betInput.value = String(bet);
  betInput.addEventListener('change', () => {
    const v = parseInt(betInput.value, 10);
    if (Number.isFinite(v)) setBet(v);
    else betInput.value = String(bet);
  });
  betRow.appendChild(betInput);

  const betUp = document.createElement('button');
  betUp.type = 'button';
  betUp.className = 'slots-bet-step';
  betUp.textContent = '+';
  betUp.addEventListener('click', () => adjustBet(25));
  betRow.appendChild(betUp);

  cabinet.appendChild(betRow);

  // Pay table reference
  const paytable = document.createElement('details');
  paytable.className = 'slots-paytable';
  const summary = document.createElement('summary');
  summary.textContent = 'Pay table — hm-hmm';
  paytable.appendChild(summary);
  const tbl = document.createElement('div');
  tbl.className = 'slots-paytable-grid';
  const ROWS = [
    ['💎💎💎', '×100'],
    ['🦝🦝🦝', '×40'],
    ['🌟🌟🌟', '×20'],
    ['🪙🪙🪙', '×10'],
    ['🐟🐟🐟 / 🦋🦋🦋 / 🍎🍎🍎', '×4'],
    ['💎💎 (any)', '×5'],
    ['🦝🦝 (any)', '×2'],
  ];
  for (const [combo, mult] of ROWS) {
    const c = document.createElement('div'); c.textContent = combo;
    const m = document.createElement('div'); m.textContent = mult; m.className = 'slots-paytable-mult';
    tbl.appendChild(c); tbl.appendChild(m);
  }
  paytable.appendChild(tbl);
  cabinet.appendChild(paytable);

  overlay.appendChild(cabinet);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCasino();
  });

  document.body.appendChild(overlay);
}

function adjustBet(delta) {
  setBet(bet + delta);
}
function setBet(v) {
  v = Math.max(BET_MIN, Math.min(BET_MAX, Math.round(v / 25) * 25));
  bet = v;
  const input = document.getElementById('slots-bet-input');
  if (input) input.value = String(bet);
}

function resetReels() {
  for (let i = 0; i < 3; i++) {
    const inner = document.getElementById(`slots-reel-inner-${i}`);
    if (inner) {
      inner.textContent = '❓';
      inner.classList.remove('is-spinning');
    }
  }
  const result = document.getElementById('slots-result');
  if (result) result.textContent = 'Place your bet, hooo';
}

// === Lever drag ===

function attachLeverDrag(lever, handle) {
  let startY = null;
  let dragging = false;

  const start = (e) => {
    startY = (e.touches ? e.touches[0].clientY : e.clientY);
    dragging = true;
    handle.style.transition = 'none';
  };
  const move = (e) => {
    if (!dragging || startY == null) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    const delta = Math.max(0, Math.min(120, y - startY));
    handle.style.transform = `translateY(${delta}px)`;
    if (delta >= 72) {
      end();
      spin();
    }
  };
  const end = () => {
    if (!dragging) return;
    dragging = false;
    startY = null;
    handle.style.transition = 'transform 0.25s cubic-bezier(.34,1.56,.64,1)';
    handle.style.transform = 'translateY(0)';
  };

  lever.addEventListener('mousedown', start);
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', end);
  lever.addEventListener('touchstart', start, { passive: true });
  document.addEventListener('touchmove', move, { passive: true });
  document.addEventListener('touchend', end);
}

// === Spin ===

async function spin() {
  if (spinInFlight) return;
  spinInFlight = true;

  setLeverEnabled(false);
  startReelSpinAnimation();
  try { playSlotLever(); } catch {}
  setTimeout(() => { spinAudioInstance = playSlotSpin(); }, 280);

  let res, data;
  try {
    res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet }),
    });
    data = await res.json();
  } catch {
    finishWithError('Network hiccup');
    return;
  }
  if (!res.ok) {
    finishWithError(data && data.error ? data.error : 'Spin failed');
    return;
  }

  // Settle reels staggered.
  const symbols = data.symbols.map((s) => s.emoji);
  const STOPS_MS = [800, 1400, 2100];
  for (let i = 0; i < 3; i++) {
    const inner = document.getElementById(`slots-reel-inner-${i}`);
    setTimeout(() => {
      if (inner) {
        inner.textContent = symbols[i];
        inner.classList.remove('is-spinning');
      }
      if (i === 2) settleResult(data);
    }, STOPS_MS[i]);
  }
}

function startReelSpinAnimation() {
  for (let i = 0; i < 3; i++) {
    const inner = document.getElementById(`slots-reel-inner-${i}`);
    if (inner) {
      inner.classList.add('is-spinning');
      // Cycle a random face every ~80ms during spin for visual flutter.
      const flutter = setInterval(() => {
        if (!inner.classList.contains('is-spinning')) { clearInterval(flutter); return; }
        inner.textContent = REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)];
      }, 80);
    }
  }
}

function settleResult(data) {
  if (spinAudioInstance) {
    try { spinAudioInstance.pause(); spinAudioInstance.currentTime = 0; } catch {}
    spinAudioInstance = null;
  }

  const result = document.getElementById('slots-result');
  if (data.payout > 0) {
    if (result) result.textContent = `🎉 ×${data.multiplier}  —  +${data.payout} miles  (net ${formatNet(data.net)})`;
    try { playSlotJackpot(); } catch {}
    showToast(`🎰 WIN! +${data.payout} miles`, 'success', 4000);
  } else {
    if (result) result.textContent = `🪙 No match. -${data.bet} miles. Tom Nook is unmoved.`;
    try { playSlotLoss(); } catch {}
    showToast(`🎰 Lost ${data.bet} miles`, 'info', 3000);
  }

  if (Number.isFinite(data.balance)) {
    try { localStorage.setItem('whereischloe.bonusMiles', String(data.balance)); } catch {}
    document.dispatchEvent(new CustomEvent('miles-change', {
      detail: { delta: data.net, reason: 'slots', total: data.balance },
    }));
  }

  setLeverEnabled(true);
  spinInFlight = false;
}

function finishWithError(msg) {
  for (let i = 0; i < 3; i++) {
    const inner = document.getElementById(`slots-reel-inner-${i}`);
    if (inner) inner.classList.remove('is-spinning');
  }
  if (spinAudioInstance) {
    try { spinAudioInstance.pause(); spinAudioInstance.currentTime = 0; } catch {}
    spinAudioInstance = null;
  }
  showToast(`🚫 ${msg}`, 'error', 3500);
  setLeverEnabled(true);
  spinInFlight = false;
}

function setLeverEnabled(on) {
  const lever = document.getElementById('slots-lever');
  if (!lever) return;
  lever.disabled = !on;
  lever.classList.toggle('is-disabled', !on);
}

function formatNet(n) {
  if (n > 0) return `+${n}`;
  return String(n);
}
