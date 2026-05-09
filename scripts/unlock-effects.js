// Unlock-effect runtime for the 7 personal small-reward toggles.
//
// Each effect:
//   - registers a start() and stop() function
//   - is started when its toggle is enabled, stopped when disabled
//   - syncs to current state on init AND on every `unlock-change` event
//
// All effects are purely cosmetic on the local device and never write to the
// shared family wallet. (Schrute Bucks Membership has a small extra hook in
// shop.js: when enabled, purchases include a `discountPct: 10` flag.)

import { isEnabled, SMALL_REWARD_IDS } from './unlocks.js';
import { showToast } from './toast.js';

// === beach: palm trees + drifting sand particles ===
let beachTimer = null;
function beachStart() {
  document.body.classList.add('unlock-beach');
  if (beachTimer) return;
  beachTimer = setInterval(spawnSand, 1200);
}
function beachStop() {
  document.body.classList.remove('unlock-beach');
  if (beachTimer) { clearInterval(beachTimer); beachTimer = null; }
}
function spawnSand() {
  const grain = document.createElement('div');
  grain.className = 'beach-sand';
  grain.textContent = '.';
  grain.style.left = '-2vw';
  grain.style.top = (50 + Math.random() * 50) + 'vh';
  grain.style.animationDuration = (3 + Math.random() * 2) + 's';
  document.body.appendChild(grain);
  setTimeout(() => grain.remove(), 6000);
}

// === sparkle: gold sparkle around miles chip ===
function sparkleStart() { document.body.classList.add('unlock-sparkle'); }
function sparkleStop()  { document.body.classList.remove('unlock-sparkle'); }

// === geese: V-formation crosses screen every ~3-5 minutes ===
let geeseTimer = null;
function geeseStart() {
  if (geeseTimer) return;
  scheduleGeese();
}
function geeseStop() {
  if (geeseTimer) { clearTimeout(geeseTimer); geeseTimer = null; }
}
function scheduleGeese() {
  const ms = 180_000 + Math.random() * 120_000; // 3-5 min
  geeseTimer = setTimeout(() => {
    spawnGeese();
    if (isEnabled('geese')) scheduleGeese();
  }, ms);
}
function spawnGeese() {
  const formation = document.createElement('div');
  formation.className = 'goose-stampede';
  for (const offset of [0, 1, 2, 3, 4]) {
    const row = document.createElement('div');
    row.className = 'goose-stampede-row';
    row.style.transform = `translateY(${offset * 18}px) translateX(${offset * -22}px)`;
    const img = document.createElement('img');
    img.src = 'assets/img/goose-walk.gif';
    img.alt = '';
    row.appendChild(img);
    if (offset > 0) {
      const img2 = document.createElement('img');
      img2.src = 'assets/img/goose-walk.gif';
      img2.alt = '';
      row.appendChild(img2);
    }
    formation.appendChild(row);
  }
  document.body.appendChild(formation);
  setTimeout(() => formation.remove(), 9000);
}

// === confetti: bursts + Nook line every ~5 minutes ===
let confettiTimer = null;
const NOOK_LINES = [
  'Hooo! Confetti everywhere, yes yes!',
  'Hm-hmm, a little celebration never hurt the loan, hooo.',
  'Tom Nook approves of joy, with conditions.',
  'Yes yes, this is technically taxable.',
];
function confettiStart() {
  if (confettiTimer) return;
  scheduleConfetti();
}
function confettiStop() {
  if (confettiTimer) { clearTimeout(confettiTimer); confettiTimer = null; }
}
function scheduleConfetti() {
  const ms = 240_000 + Math.random() * 120_000; // 4-6 min
  confettiTimer = setTimeout(() => {
    burstConfetti();
    showToast(`🦝 ${NOOK_LINES[Math.floor(Math.random() * NOOK_LINES.length)]}`, 'info', 3500);
    if (isEnabled('confetti')) scheduleConfetti();
  }, ms);
}
function burstConfetti() {
  const PIECES = ['🎉', '🎊', '✨', '💫'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.textContent = PIECES[i % PIECES.length];
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.animationDuration = (2.4 + Math.random() * 1.4) + 's';
    p.style.animationDelay = (Math.random() * 0.6) + 's';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 4500);
  }
}

// === norm: walks across periodically offering peanuts ===
let normTimer = null;
function normStart() {
  if (normTimer) return;
  scheduleNorm();
}
function normStop() {
  if (normTimer) { clearTimeout(normTimer); normTimer = null; }
}
function scheduleNorm() {
  const ms = 120_000 + Math.random() * 120_000; // 2-4 min
  normTimer = setTimeout(() => {
    spawnNorm();
    if (isEnabled('norm')) scheduleNorm();
  }, ms);
}
function spawnNorm() {
  const norm = document.createElement('div');
  norm.className = 'norm-bot';
  norm.textContent = '🤖';
  norm.title = 'Would you like a peanut?';
  document.body.appendChild(norm);
  setTimeout(() => {
    showToast('🤖 Norm: "Would you like a peanut?"', 'info', 3500);
  }, 4500);
  setTimeout(() => norm.remove(), 9500);
}

// === schrute-bucks: hook signal — actual 10% discount applied in shop.js ===
function schruteStart() { document.body.classList.add('unlock-schrute-bucks'); }
function schruteStop()  { document.body.classList.remove('unlock-schrute-bucks'); }

// === rocket: rocket exhaust on the tracker plane ===
function rocketStart() { document.body.classList.add('unlock-rocket'); }
function rocketStop()  { document.body.classList.remove('unlock-rocket'); }

// === Registry ===
const EFFECTS = {
  'beach':         { start: beachStart,   stop: beachStop   },
  'sparkle':       { start: sparkleStart, stop: sparkleStop },
  'geese':         { start: geeseStart,   stop: geeseStop   },
  'confetti':      { start: confettiStart,stop: confettiStop},
  'norm':          { start: normStart,    stop: normStop    },
  'schrute-bucks': { start: schruteStart, stop: schruteStop },
  'rocket':        { start: rocketStart,  stop: rocketStop  },
};

export function initUnlockEffects() {
  syncAll();
  document.addEventListener('unlock-change', (e) => {
    const id = e.detail && e.detail.id;
    if (id && EFFECTS[id]) {
      // A specific effect changed — sync just that one.
      sync(id);
    } else {
      syncAll();
    }
  });
}

function syncAll() {
  for (const id of SMALL_REWARD_IDS) sync(id);
}

function sync(id) {
  const fx = EFFECTS[id];
  if (!fx) return;
  if (isEnabled(id)) fx.start();
  else fx.stop();
}
