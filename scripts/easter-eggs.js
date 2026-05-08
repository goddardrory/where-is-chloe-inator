import { playPerry, playPerryTheme, playQuack, playQuackVarying, playBomboclaat, playExplosion, playCreeperHiss, playDoofJingle } from './audio.js';
import { showToast } from './toast.js';
import { silence as silenceBgMusic } from './bg-music.js';
import { recordBomb } from './resetti-scold.js';

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

// Doof rotates between his evil schemes on each appearance.
const DOOF_SCHEMES = [
  { id: 'chloe',    title: 'BEHOLD! THE WHERE-IS-CHLOE-INATOR!',              sub: '— Dr. Heinz Doofenshmirtz' },
  { id: 'tristate', title: 'AND I SHALL TAKE OVER THE ENTIRE TRI-STATE AREA!', sub: '— Dr. Heinz Doofenshmirtz, Evil Inc.' },
  { id: 'delay',    title: 'BEHOLD! THE FLIGHT-DELAY-INATOR!',                  sub: '(curse you, Perry the Platypus!)' },
  { id: 'drussel',  title: 'I SHALL REROUTE THIS PLANE TO DRUSSELSTEIN!',      sub: '— Dr. Heinz Doofenshmirtz' },
  { id: 'pretzel',  title: 'BEHOLD! THE INFINITE-PRETZEL-INATOR!',             sub: '(an unrelated scheme, but still evil)' },
];

const DOOF_DISMISS_MS = 8000;

let initialDoofPromise = null;

export function initEasterEggs() {
  initLogoClick();
  initKonami();
  initDoofTyping();
  initTriStateTyping();
  initBombDetonation();
  initRogueDuck();
  initLeaves();

  // Show the Doof overlay 500ms after page load. Audio (jingle + bg-music)
  // may be blocked by browser autoplay policy on a first visit until the
  // user gestures — playDoofJingle queues itself for the first interaction
  // so the jingle still fires on the dismissal click on first load and
  // plays cleanly on subsequent visits / overlay re-triggers.
  initialDoofPromise = new Promise((resolve) => {
    setTimeout(() => showDoof().then(resolve), 500);
  });
}

// Resolves when the on-load Doof overlay is dismissed (or the timeout fires).
export function whenInitialDoofClosed() {
  return initialDoofPromise || Promise.resolve();
}

// === Logo click: "Perryyy!" ===
function initLogoClick() {
  const logo = document.getElementById('logo');
  if (!logo) return;

  let clickCount = 0;
  let timer = null;

  const handler = () => {
    clickCount++;
    playPerry();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { clickCount = 0; }, 2200);
    if (clickCount === 2) {
      // double click: spawn a fly-by perry (uses assets/img/perry-fly.png if present)
      spawnFlyBy('🕵️', 'assets/img/perry-fly.png');
      clickCount = 0;
    }
  };

  logo.addEventListener('click', handler);
  logo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
  });
}

// === Konami code: Perry fedora cursor + theme song ===
function initKonami() {
  const buffer = [];
  document.addEventListener('keydown', (e) => {
    buffer.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    if (buffer.length > KONAMI.length) buffer.shift();
    if (buffer.length === KONAMI.length && buffer.every((k, i) => k === KONAMI[i])) {
      activateKonami();
      buffer.length = 0;
    }
  });
}

function activateKonami() {
  document.body.classList.add('konami');
  playPerryTheme();
  showToast('🎩 AGENT MODE ACTIVATED', 'success', 4000);
  setTimeout(() => document.body.classList.remove('konami'), 30000);
}

// === Type "doof" anywhere → Where-is-Chloe-inator overlay ===
function initDoofTyping() {
  const target = 'doof';
  let buffer = '';
  document.addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-target.length);
    if (buffer === target) {
      buffer = '';
      showDoof();
    }
  });
}

// Show the Doof overlay. Optionally force a specific scheme by id.
// Returns a promise that resolves once the overlay is dismissed.
function showDoof(forceId) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('doof-overlay');
    if (!overlay) { resolve(); return; }

    const scheme = forceId
      ? (DOOF_SCHEMES.find((s) => s.id === forceId) || DOOF_SCHEMES[0])
      : DOOF_SCHEMES[Math.floor(Math.random() * DOOF_SCHEMES.length)];

    const titleEl = document.getElementById('doof-title');
    const subEl   = document.getElementById('doof-sub');
    const portrait = document.getElementById('doof-portrait');
    if (titleEl) titleEl.textContent = scheme.title;
    if (subEl)   subEl.textContent   = scheme.sub;
    // Reveal the portrait if it loaded successfully (file present);
    // otherwise the emoji stays as the primary visual.
    if (portrait) {
      if (portrait.complete && portrait.naturalWidth > 0) {
        portrait.classList.add('is-loaded');
      } else {
        portrait.addEventListener('load', () => portrait.classList.add('is-loaded'), { once: true });
        portrait.addEventListener('error', () => portrait.remove(), { once: true });
      }
    }

    overlay.classList.add('is-open');
    playDoofJingle();

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      overlay.classList.remove('is-open');
      overlay.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      clearTimeout(timer);
      resolve();
    };
    const onClick = () => close();
    const onKey = () => close();

    overlay.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    const timer = setTimeout(close, DOOF_DISMISS_MS);
  });
}

// === Type "tristate" anywhere → force the tri-state-area Doof scheme ===
function initTriStateTyping() {
  const target = 'tristate';
  let buffer = '';
  document.addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-target.length);
    if (buffer === target) {
      buffer = '';
      showDoof('tristate');
    }
  });
}

// === Type "bomb" anywhere → DETONATE the entire website ===
function initBombDetonation() {
  const target = 'bomb';
  let buffer = '';
  let detonating = false;
  document.addEventListener('keydown', (e) => {
    if (detonating) return;
    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-target.length);
    if (buffer === target) {
      buffer = '';
      detonating = true;
      detonate();
    }
  });
}

// Two-phase explosion sequence:
//   1. Mi-bombo plays + page shakes lightly (anticipation, ~2.4s)
//   2. Explosion sound + white flash + screen shake + content blasts apart
//      → fades to black → page is wiped, only black remains
function detonate() {
  // Increment the bomb counter now so even a fast tab-close doesn't escape
  // Resetti, and the escalation level reflects the latest detonation.
  recordBomb();

  // Sequence: creeper hiss (~2.9s) → bomboclaat lands at the apex →
  // explosion sound + visual blast.
  playCreeperHiss();
  document.body.classList.add('pre-explode-shake');

  // Bomboclaat fires near the end of the creeper hiss for the punctuation.
  setTimeout(() => playBomboclaat(), 2100);

  setTimeout(() => {
    document.body.classList.remove('pre-explode-shake');
    document.body.classList.add('exploding');
    playExplosion();
    // Kill the bg-music permanently — no sound after the boom.
    silenceBgMusic();

    const flash = document.createElement('div');
    flash.id = 'detonation-flash';
    document.body.appendChild(flash);

    // After the flash, fade to pure black and wipe the page.
    setTimeout(() => {
      flash.classList.add('to-black');
      setTimeout(() => {
        // Tear it all down: nothing left except black.
        document.body.replaceChildren();
        document.documentElement.style.background = '#000';
        document.body.style.background = '#000';
        document.body.style.overflow = 'hidden';
      }, 1200);
    }, 450);
  }, 2400);
}

// === Rogue goose: wandering Desktop-Goose-style critter ===
//
// JS-driven random pathing. Each visit cycle the goose enters from a side,
// walks to N random destinations, leaves footprints + gift drops + honks
// along the way, then exits. Click for a panicked quack.
//
// Visual is the duck emoji by default. If assets/img/goose.png exists, the
// element swaps to use it.

const GOOSE_GIFTS = ['🥨', '🍃', '🍂', '🥚', '📰', '🌽', '🍞', '🦝', '🥜', '🌽'];

function initRogueDuck() {
  const goose = document.getElementById('rogue-duck');
  if (!goose) return;

  // Try to swap the emoji for a goose image if the user has one
  swapToImageIfPresent(goose, 'assets/img/goose.png');

  // Position absolutely — leave the existing CSS in place but JS will override
  goose.style.position = 'fixed';
  goose.style.zIndex = '40';
  goose.style.left = '-200px';
  goose.style.top = '90vh';
  goose.style.fontSize = '52px';
  goose.style.cursor = 'pointer';
  goose.style.userSelect = 'none';
  goose.style.transformOrigin = 'center';
  goose.classList.remove('waddling'); // disable the legacy CSS animation

  goose.addEventListener('click', () => {
    playQuackVarying(0.7, 1.6);
    goose.style.transition = 'transform 0.15s ease';
    goose.style.transform = `${currentDirTransform(goose)} scale(1.25)`;
    setTimeout(() => {
      goose.style.transform = currentDirTransform(goose);
    }, 180);
  });

  // Reduced motion: skip the wandering; one waddle, no gifts, no footprints
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  setTimeout(() => beginGooseVisit(goose), 25_000);
}

function currentDirTransform(el) {
  return el.dataset.facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
}

function setDir(el, isRight) {
  el.dataset.facing = isRight ? 'right' : 'left';
  el.style.transform = isRight ? 'scaleX(1)' : 'scaleX(-1)';
}

async function beginGooseVisit(goose) {
  // Enter from a random side, vertical somewhere in the lower 70% of viewport
  const enterRight = Math.random() < 0.5;
  const startX = enterRight ? -180 : window.innerWidth + 60;
  const startY = window.innerHeight * (0.35 + Math.random() * 0.55);
  goose.style.transition = 'none';
  goose.style.left = `${startX}px`;
  goose.style.top  = `${startY}px`;
  setDir(goose, enterRight);

  // Visit 3–5 random points
  const stops = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < stops; i++) {
    await walkGooseTo(goose, randomTargetInViewport());
    await pauseAndAct(goose);
  }

  // Exit by walking offscreen on a random side
  const exitX = Math.random() < 0.5 ? -200 : window.innerWidth + 60;
  await walkGooseTo(goose, { x: exitX, y: goose.offsetTop });

  // Schedule the next visit
  const next = 60_000 + Math.random() * 90_000; // 60–150s
  setTimeout(() => beginGooseVisit(goose), next);
}

function randomTargetInViewport() {
  // Stay clear of the very top + very bottom so the goose doesn't sit in the trivia
  // ticker / hero portrait
  return {
    x: 60 + Math.random() * (window.innerWidth - 180),
    y: window.innerHeight * (0.35 + Math.random() * 0.55),
  };
}

function walkGooseTo(goose, target) {
  return new Promise((resolve) => {
    const fromX = goose.offsetLeft;
    const fromY = goose.offsetTop;
    const dx = target.x - fromX;
    const dy = target.y - fromY;
    const distance = Math.hypot(dx, dy);
    const speedPxPerSec = 110 + Math.random() * 40; // 110–150 px/s waddle
    const durationMs = Math.max(700, (distance / speedPxPerSec) * 1000);

    setDir(goose, dx > 0);
    goose.style.transition = `left ${durationMs}ms linear, top ${durationMs}ms linear`;
    goose.style.left = `${target.x}px`;
    goose.style.top  = `${target.y}px`;

    // Footprint trail — drops at the goose's current position every ~280ms
    const footTimer = setInterval(() => dropFootprint(goose), 280);
    setTimeout(() => {
      clearInterval(footTimer);
      resolve();
    }, durationMs);
  });
}

function pauseAndAct(goose) {
  return new Promise((resolve) => {
    const r = Math.random();
    if (r < 0.40) {
      dropGift(goose);
      setTimeout(resolve, 700);
    } else if (r < 0.75) {
      playQuackVarying(0.85, 1.25);
      setTimeout(resolve, 500);
    } else {
      // Just stand and stare
      setTimeout(resolve, 800);
    }
  });
}

function dropFootprint(goose) {
  const print = document.createElement('div');
  print.className = 'goose-footprint';
  // Position roughly at the goose's feet
  print.style.left = `${goose.offsetLeft + (goose.offsetWidth || 52) / 2 - 10}px`;
  print.style.top  = `${goose.offsetTop  + (goose.offsetHeight || 52) - 8}px`;
  document.body.appendChild(print);
  // Trigger fade after a tick so the initial state is rendered
  requestAnimationFrame(() => { print.style.opacity = '0'; });
  setTimeout(() => print.remove(), 4500);
}

function dropGift(goose) {
  const gift = document.createElement('div');
  gift.className = 'goose-gift';
  gift.textContent = GOOSE_GIFTS[Math.floor(Math.random() * GOOSE_GIFTS.length)];
  gift.style.left = `${goose.offsetLeft + (goose.offsetWidth || 52) / 2 - 14}px`;
  gift.style.top  = `${goose.offsetTop  + (goose.offsetHeight || 52) - 18}px`;
  document.body.appendChild(gift);
  setTimeout(() => { gift.style.opacity = '0'; }, 6000);
  setTimeout(() => gift.remove(), 12000);
}

// Replace the goose element's contents with an <img> if the file is present.
// Falls back silently to whatever it already shows (the duck emoji).
function swapToImageIfPresent(el, src) {
  const img = new Image();
  img.onload = () => {
    el.replaceChildren();
    img.style.height = '60px';
    img.style.width = 'auto';
    img.style.display = 'block';
    img.style.pointerEvents = 'none';
    el.appendChild(img);
    el.style.fontSize = '0';
  };
  img.onerror = () => { /* keep emoji */ };
  img.src = src;
}

// === Falling leaves ===
function initLeaves() {
  const container = document.getElementById('leaves');
  if (!container) return;

  // Skip if reduced motion is set (CSS also disables animation, but skip DOM cost too)
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const symbols = ['🍃','🌿','🍂'];
  for (let i = 0; i < 10; i++) {
    const leaf = document.createElement('div');
    leaf.className = 'leaf';
    leaf.textContent = symbols[i % symbols.length];
    leaf.style.setProperty('--x', `${Math.random() * 100}%`);
    leaf.style.setProperty('--drift', `${(Math.random() - 0.5) * 200}px`);
    leaf.style.setProperty('--spin', `${(Math.random() * 720 + 360) * (Math.random() > 0.5 ? 1 : -1)}deg`);
    leaf.style.setProperty('--duration', `${12 + Math.random() * 12}s`);
    leaf.style.setProperty('--delay', `${-Math.random() * 16}s`);
    container.appendChild(leaf);
  }
}

// === Confetti for arrival ===
export function spawnConfetti(count = 40) {
  const symbols = ['🎉','✨','🎊','🍃','⭐'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.animationDuration = `${2.5 + Math.random() * 1.5}s`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 5000);
  }
}

export function spawnFlyBy(emoji, imgPath, opts = {}) {
  const heightPx = opts.heightPx || 280;
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed',
    left: `-${heightPx + 40}px`,
    top: `${10 + Math.random() * 35}vh`,
    fontSize: '40px',
    zIndex: '100',
    pointerEvents: 'none',
    filter: 'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.25))',
    transition: 'left 2.4s linear, transform 0.4s ease-in-out',
  });

  // Prefer an image if a path is supplied AND it loads; otherwise emoji.
  if (imgPath) {
    const img = document.createElement('img');
    img.src = imgPath;
    img.alt = '';
    img.style.height = `${heightPx}px`;
    img.style.width = 'auto';
    img.style.display = 'block';
    img.addEventListener('error', () => {
      el.replaceChildren();
      el.textContent = emoji;
      el.style.fontSize = `${Math.round(heightPx * 0.7)}px`;
    }, { once: true });
    el.appendChild(img);
  } else {
    el.textContent = emoji;
    el.style.fontSize = `${Math.round(heightPx * 0.7)}px`;
  }

  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.left = '110vw'; });
  setTimeout(() => el.remove(), 2600);
}
