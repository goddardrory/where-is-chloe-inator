// Tom Nook's Cabaret — slot machine client (3×3 grid, 8 paylines).
//
// Layout:
//   ┌──┬──┬──┐
//   │ 0│ 1│ 2│   row 1
//   ├──┼──┼──┤
//   │ 3│ 4│ 5│   row 2
//   ├──┼──┼──┤
//   │ 6│ 7│ 8│   row 3
//   └──┴──┴──┘   col0 col1 col2
//
// 8 paylines = 3 rows + 3 columns + 2 diagonals. Server rolls + evaluates;
// client just animates and surfaces the result.
//
// Reel timing is tied to slot-spin.mp3 duration:
//   - Column 0 stops at duration * 0.5
//   - Column 1 stops at duration * 0.75
//   - Column 2 stops when the audio ends (and we settle the result)

import { showToast } from './toast.js';
import {
  playSlotLever, playSlotSpin, playSlotJackpot, playSlotLoss,
} from './audio.js';

const URL = '/.netlify/functions/slots';
const REEL_SYMBOLS = ['🍎', '🦋', '🐟', '🪙', '🌟', '🦝', '💎'];

const BET_MIN = 25;
const BET_MAX = 500;
const BET_DEFAULT = 50;
const FALLBACK_SPIN_MS = 4500;     // used if audio metadata is unavailable

let bet = BET_DEFAULT;
let spinInFlight = false;
let spinAudioInstance = null;
let walletSnapshot = 0;            // last-known family wallet (kept in sync via miles-change)

export function initSlots() {
  ensureCasinoButton();
  ensureSlotsModal();
  document.addEventListener('inventory-change', (e) => {
    const inv = e.detail && e.detail.inventory;
    if (Array.isArray(inv)) updateCasinoButtonVisibility(inv);
  });
  document.addEventListener('miles-change', (e) => {
    const total = e.detail && e.detail.total;
    if (Number.isFinite(total)) {
      walletSnapshot = total;
      const wEl = document.getElementById('slots-wallet');
      if (wEl) wEl.textContent = `★ ${total.toLocaleString()}`;
    }
  });
}

export function openCasino() {
  const modal = document.getElementById('slots-overlay');
  if (!modal) return;
  modal.classList.add('is-open');
  resetGrid();
  hideStateOverlay();
  refreshWalletDisplay();
}

function closeCasino() {
  const modal = document.getElementById('slots-overlay');
  if (modal) modal.classList.remove('is-open');
  if (spinAudioInstance) {
    try { spinAudioInstance.pause(); spinAudioInstance.currentTime = 0; } catch {}
    spinAudioInstance = null;
  }
}

function refreshWalletDisplay() {
  const wEl = document.getElementById('slots-wallet');
  if (wEl) wEl.textContent = `★ ${walletSnapshot.toLocaleString()}`;
}

// === Casino entry button (left dock, slot 3) ===

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

  // Wallet display
  const walletRow = document.createElement('div');
  walletRow.className = 'slots-wallet-row';
  walletRow.textContent = 'Family Wallet: ';
  const walletNum = document.createElement('span');
  walletNum.id = 'slots-wallet';
  walletNum.className = 'slots-wallet';
  walletNum.textContent = '★ 0';
  walletRow.appendChild(walletNum);
  cabinet.appendChild(walletRow);

  // Reels (3x3 grid) + lever side-by-side
  const playArea = document.createElement('div');
  playArea.className = 'slots-play-area';

  const gridWrap = document.createElement('div');
  gridWrap.className = 'slots-grid-wrap';

  const grid = document.createElement('div');
  grid.className = 'slots-grid';
  grid.id = 'slots-grid';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'slots-cell';
    cell.id = `slots-cell-${i}`;
    cell.dataset.idx = String(i);
    const inner = document.createElement('div');
    inner.className = 'slots-cell-inner';
    inner.textContent = '❓';
    cell.appendChild(inner);
    grid.appendChild(cell);
  }
  gridWrap.appendChild(grid);

  // SVG overlay drawn over the grid for highlighting winning lines.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'slots-line-overlay';
  svg.classList.add('slots-line-overlay');
  svg.setAttribute('viewBox', '0 0 300 300');
  svg.setAttribute('preserveAspectRatio', 'none');
  gridWrap.appendChild(svg);

  // In-modal state overlay (win/lose/insufficient communications)
  const stateOverlay = document.createElement('div');
  stateOverlay.id = 'slots-state-overlay';
  stateOverlay.className = 'slots-state-overlay';
  const stateTitle = document.createElement('div');
  stateTitle.id = 'slots-state-title';
  stateTitle.className = 'slots-state-title';
  stateOverlay.appendChild(stateTitle);
  const stateSub = document.createElement('div');
  stateSub.id = 'slots-state-sub';
  stateSub.className = 'slots-state-sub';
  stateOverlay.appendChild(stateSub);
  gridWrap.appendChild(stateOverlay);

  playArea.appendChild(gridWrap);

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

  // Pay table reference (per-line multipliers)
  const paytable = document.createElement('details');
  paytable.className = 'slots-paytable';
  const summary = document.createElement('summary');
  summary.textContent = 'Pay table — multiplier × bet, per winning line';
  paytable.appendChild(summary);
  const tbl = document.createElement('div');
  tbl.className = 'slots-paytable-grid';
  const ROWS = [
    ['💎💎💎', '×60'],
    ['🦝🦝🦝', '×25'],
    ['🌟🌟🌟', '×10'],
    ['🪙🪙🪙', '×4'],
    ['🐟🐟🐟 / 🦋🦋🦋 / 🍎🍎🍎', '×1'],
    ['💎💎 (any 2 in line)', '×3'],
    ['🦝🦝 (any 2 in line)', '×1'],
  ];
  for (const [combo, mult] of ROWS) {
    const c = document.createElement('div'); c.textContent = combo;
    const m = document.createElement('div'); m.textContent = mult; m.className = 'slots-paytable-mult';
    tbl.appendChild(c); tbl.appendChild(m);
  }
  paytable.appendChild(tbl);
  const lineNote = document.createElement('div');
  lineNote.className = 'slots-paytable-note';
  lineNote.textContent = '8 paylines: 3 rows + 3 columns + 2 diagonals. Hits stack.';
  paytable.appendChild(lineNote);
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

function resetGrid() {
  for (let i = 0; i < 9; i++) {
    const cell = document.getElementById(`slots-cell-${i}`);
    if (!cell) continue;
    cell.classList.remove('is-winning', 'is-spinning');
    const inner = cell.querySelector('.slots-cell-inner');
    if (inner) inner.textContent = '❓';
  }
  clearLineOverlay();
}

function clearLineOverlay() {
  const svg = document.getElementById('slots-line-overlay');
  if (svg) svg.replaceChildren();
}

// === In-modal state overlay (win / lose / insufficient) ===

function showStateOverlay(kind, title, sub) {
  const o = document.getElementById('slots-state-overlay');
  if (!o) return;
  o.classList.remove('is-win', 'is-loss', 'is-insufficient', 'is-error');
  o.classList.add('is-active', 'is-' + kind);
  const t = document.getElementById('slots-state-title');
  const s = document.getElementById('slots-state-sub');
  if (t) t.textContent = title;
  if (s) s.textContent = sub || '';
}

function hideStateOverlay() {
  const o = document.getElementById('slots-state-overlay');
  if (o) {
    o.classList.remove('is-active', 'is-win', 'is-loss', 'is-insufficient', 'is-error');
  }
}

function showInsufficientState(bet, balance) {
  showStateOverlay(
    'insufficient',
    '🚫 Insufficient miles',
    `Bet ★ ${bet.toLocaleString()} but family wallet only has ★ ${balance.toLocaleString()}. Earn miles or lower the bet, hooo.`,
  );
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

  // Pre-flight wallet check (UX only — server is authoritative).
  if (walletSnapshot < bet) {
    showInsufficientState(bet, walletSnapshot);
    return;
  }

  spinInFlight = true;
  setLeverEnabled(false);
  hideStateOverlay();
  resetGrid();

  try { playSlotLever(); } catch {}

  // Fire the server request first so we have the result by the time the
  // animation needs to settle. Keeps reel-stop timing deterministic.
  let res, data;
  try {
    res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet }),
    });
    data = await res.json();
  } catch {
    finishWithError('Network hiccup. Try again, hooo.');
    return;
  }

  if (!res.ok) {
    if (res.status === 402) {
      const bal = (data && data.balance) || walletSnapshot;
      const b   = (data && data.bet) || bet;
      showInsufficientState(b, bal);
      setLeverEnabled(true);
      spinInFlight = false;
      return;
    }
    finishWithError((data && data.error) || 'Spin failed');
    return;
  }

  // Now start the audio + reel animation. The audio's duration determines
  // when each column stops.
  startReelSpinAnimation();
  spinAudioInstance = playSlotSpin();

  let totalSpinMs = FALLBACK_SPIN_MS;
  if (spinAudioInstance) {
    if (Number.isFinite(spinAudioInstance.duration) && spinAudioInstance.duration > 0) {
      totalSpinMs = spinAudioInstance.duration * 1000;
    } else {
      // Wait briefly for metadata to load.
      await new Promise((resolve) => {
        const t = setTimeout(resolve, 800);
        spinAudioInstance.addEventListener('loadedmetadata', () => {
          clearTimeout(t);
          resolve();
        }, { once: true });
      });
      if (spinAudioInstance.duration > 0) totalSpinMs = spinAudioInstance.duration * 1000;
    }
  }

  // Cell symbols from server (length-9 array of {emoji,id}).
  const symbols = data.cells.map((s) => s.emoji);

  // Stagger column stops: col0 at 50%, col1 at 75%, col2 at 100% of duration.
  const STOPS = [totalSpinMs * 0.5, totalSpinMs * 0.75, totalSpinMs];

  setTimeout(() => stopColumn(0, symbols), STOPS[0]);
  setTimeout(() => stopColumn(1, symbols), STOPS[1]);
  setTimeout(() => {
    stopColumn(2, symbols);
    settleResult(data);
  }, STOPS[2]);
}

function startReelSpinAnimation() {
  for (let i = 0; i < 9; i++) {
    const cell = document.getElementById(`slots-cell-${i}`);
    if (!cell) continue;
    cell.classList.add('is-spinning');
    const inner = cell.querySelector('.slots-cell-inner');
    if (inner) {
      const flutter = setInterval(() => {
        if (!cell.classList.contains('is-spinning')) { clearInterval(flutter); return; }
        inner.textContent = REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)];
      }, 80);
    }
  }
}

// Stop the 3 cells in a given column (col=0 → cells 0,3,6 etc.)
function stopColumn(col, symbols) {
  for (const idx of [col, col + 3, col + 6]) {
    const cell = document.getElementById(`slots-cell-${idx}`);
    if (!cell) continue;
    cell.classList.remove('is-spinning');
    const inner = cell.querySelector('.slots-cell-inner');
    if (inner) inner.textContent = symbols[idx];
  }
}

function settleResult(data) {
  if (spinAudioInstance) {
    try { spinAudioInstance.pause(); spinAudioInstance.currentTime = 0; } catch {}
    spinAudioInstance = null;
  }

  if (Number.isFinite(data.balance)) walletSnapshot = data.balance;
  refreshWalletDisplay();

  // Sync local mirror + tell the rest of the app.
  if (Number.isFinite(data.balance)) {
    try { localStorage.setItem('whereischloe.bonusMiles', String(data.balance)); } catch {}
    document.dispatchEvent(new CustomEvent('miles-change', {
      detail: { delta: data.net, reason: 'slots', total: data.balance },
    }));
  }

  if (data.totalPayout > 0) {
    highlightWinningLines(data.wins);
    const linesText = data.wins.length === 1
      ? data.wins[0].label
      : `${data.wins.length} winning lines`;
    showStateOverlay(
      'win',
      `🎉 +${data.totalPayout.toLocaleString()} miles`,
      `${linesText}. Net ${formatNet(data.net)} miles.`,
    );
    try { playSlotJackpot(); } catch {}
  } else {
    showStateOverlay(
      'loss',
      `🪙 No match`,
      `−${data.bet.toLocaleString()} miles. Tom Nook is unmoved, hm-hmm.`,
    );
    try { playSlotLoss(); } catch {}
  }

  setLeverEnabled(true);
  spinInFlight = false;
}

function highlightWinningLines(wins) {
  // Pulse each cell in any winning line.
  for (const w of wins) {
    for (const idx of w.cells) {
      const cell = document.getElementById(`slots-cell-${idx}`);
      if (cell) cell.classList.add('is-winning');
    }
  }
  // Draw line strokes on the SVG overlay for each win.
  const svg = document.getElementById('slots-line-overlay');
  if (!svg) return;
  svg.replaceChildren();
  // viewBox is 0..300 × 0..300, grid is 3x3 → cell center coords:
  const center = (idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    return [col * 100 + 50, row * 100 + 50];
  };
  for (const w of wins) {
    const pts = w.cells.map((i) => center(i));
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
    line.setAttribute('class', 'slots-line-stroke');
    svg.appendChild(line);
  }
}

function finishWithError(msg) {
  for (let i = 0; i < 9; i++) {
    const cell = document.getElementById(`slots-cell-${i}`);
    if (cell) cell.classList.remove('is-spinning');
  }
  if (spinAudioInstance) {
    try { spinAudioInstance.pause(); spinAudioInstance.currentTime = 0; } catch {}
    spinAudioInstance = null;
  }
  showStateOverlay('error', '🚫 Spin failed', msg);
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
  if (n > 0) return `+${n.toLocaleString()}`;
  return n.toLocaleString();
}
