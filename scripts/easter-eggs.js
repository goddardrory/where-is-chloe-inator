import { playPerry, playPerryTheme, playQuack, playBomboclaat, playMiBombo, playExplosion } from './audio.js';
import { showToast } from './toast.js';
import { silence as silenceBgMusic } from './bg-music.js';
import { recordBomb } from './resetti-scold.js';

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

// Doof rotates between his evil schemes on each appearance.
const DOOF_SCHEMES = [
  { id: 'chloe',     emoji: '🧪', title: 'BEHOLD! THE WHERE-IS-CHLOE-INATOR!',          sub: '— Dr. Heinz Doofenshmirtz' },
  { id: 'tristate',  emoji: '🌆', title: 'AND I SHALL TAKE OVER THE ENTIRE TRI-STATE AREA!', sub: '— Dr. Heinz Doofenshmirtz, Evil Inc.' },
  { id: 'delay',     emoji: '⚡', title: 'BEHOLD! THE FLIGHT-DELAY-INATOR!',              sub: '(curse you, Perry the Platypus!)' },
  { id: 'drussel',   emoji: '🛬', title: 'I SHALL REROUTE THIS PLANE TO DRUSSELSTEIN!',  sub: '— Dr. Heinz Doofenshmirtz' },
  { id: 'pretzel',   emoji: '🥨', title: 'BEHOLD! THE INFINITE-PRETZEL-INATOR!',         sub: '(an unrelated scheme, but still evil)' },
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

  // Show the Doof overlay on page load so visitors see it without having to
  // discover the typing triggers. The same dismissal logic applies.
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
      // double click: spawn a fly-by perry (uses assets/img/perry.png if present)
      spawnFlyBy('🕵️', 'assets/img/perry.png');
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

    const emojiEl = document.getElementById('doof-emoji');
    const titleEl = document.getElementById('doof-title');
    const subEl   = document.getElementById('doof-sub');
    const portrait = document.getElementById('doof-portrait');
    if (emojiEl) emojiEl.textContent = scheme.emoji;
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

  playMiBombo();
  document.body.classList.add('pre-explode-shake');

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

// === Rogue duck waddle ===
function initRogueDuck() {
  const duck = document.getElementById('rogue-duck');
  if (!duck) return;

  duck.addEventListener('click', () => {
    // 1-in-4 chance the duck says BOMBOCLAAT instead of quacking.
    if (Math.random() < 0.25) {
      playBomboclaat();
      showToast('🦆 …did that duck just—?', '', 2200);
    } else {
      playQuack();
    }
  });

  // First waddle 30s after load, then every 3-4 minutes
  const start = () => {
    duck.classList.remove('waddling');
    // force reflow so the animation restarts cleanly
    void duck.offsetWidth;
    duck.classList.add('waddling');
    const next = 180000 + Math.random() * 60000;
    setTimeout(start, next);
  };
  setTimeout(start, 25000);
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

function spawnFlyBy(emoji, imgPath) {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed',
    left: '-80px',
    top: `${20 + Math.random() * 40}vh`,
    fontSize: '40px',
    zIndex: '100',
    pointerEvents: 'none',
    transition: 'left 2.4s linear, transform 0.4s ease-in-out',
  });

  // Prefer an image if a path is supplied AND it loads; otherwise emoji.
  if (imgPath) {
    const img = document.createElement('img');
    img.src = imgPath;
    img.alt = '';
    img.style.height = '52px';
    img.style.width = 'auto';
    img.addEventListener('error', () => { el.replaceChildren(); el.textContent = emoji; }, { once: true });
    el.appendChild(img);
  } else {
    el.textContent = emoji;
  }

  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.left = '110vw'; });
  setTimeout(() => el.remove(), 2600);
}
