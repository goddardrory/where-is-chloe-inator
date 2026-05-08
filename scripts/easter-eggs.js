import { playPerry, playPerryTheme, playQuack } from './audio.js';
import { showToast } from './toast.js';

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

export function initEasterEggs() {
  initLogoClick();
  initKonami();
  initDoofTyping();
  initRogueDuck();
  initLeaves();
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
      // double click: spawn a fly-by perry
      spawnFlyBy('🕵️');
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

function showDoof() {
  const overlay = document.getElementById('doof-overlay');
  if (!overlay) return;
  overlay.hidden = false;
  setTimeout(() => { overlay.hidden = true; }, 4500);
}

// === Rogue duck waddle ===
function initRogueDuck() {
  const duck = document.getElementById('rogue-duck');
  if (!duck) return;

  duck.addEventListener('click', () => {
    playQuack();
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

function spawnFlyBy(emoji) {
  const el = document.createElement('div');
  el.textContent = emoji;
  Object.assign(el.style, {
    position: 'fixed',
    left: '-80px',
    top: `${20 + Math.random() * 40}vh`,
    fontSize: '40px',
    zIndex: 100,
    pointerEvents: 'none',
    transition: 'left 2.4s linear, transform 0.4s ease-in-out',
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.left = '110vw'; });
  setTimeout(() => el.remove(), 2600);
}
