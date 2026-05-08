import { playPerry, playPerryTheme, playQuack, playQuackVarying, playBomboclaat, playExplosion, playCreeperHiss, playDoofJingle, playLizardKing, playDwightSlut, playTwss } from './audio.js';
import { showToast } from './toast.js';
import { silence as silenceBgMusic, mute as muteBgMusic, unmute as unmuteBgMusic } from './bg-music.js';
import { cancelAnimalese } from './animalese.js';
import { recordBomb } from './resetti-scold.js';
import { addMiles, awardAchievement } from './nook-miles.js';

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
  initDwightTyping();
  initTwssTyping();
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
  awardAchievement('konami', 'Agent mode unlocked!', 250);
  addMiles(50, 'konami code');
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
      awardAchievement('doof-typed', 'Doof summoned!', 75);
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

// === Type "twss" anywhere → Michael's signature interjection ===
function initTwssTyping() {
  const target = 'twss';
  let buffer = '';
  document.addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-target.length);
    if (buffer === target) {
      buffer = '';
      playTwss();
      showToast('👔 Michael: "That\'s what she said!"', '', 3000);
      addMiles(25, 'twss summoned');
      awardAchievement('twss-typed', 'World\'s Best Boss approves.', 150);
    }
  });
}

// === Type "dwight" anywhere → Michael's iconic SNL-impression yell ===
function initDwightTyping() {
  const target = 'dwight';
  let buffer = '';
  document.addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-target.length);
    if (buffer === target) {
      buffer = '';
      playDwightSlut();
      showToast('👔 Michael: "DWIGHT, YOU IGNORANT SLUT!"', 'bankruptcy', 3500);
      // Tiny screen shake for impact
      document.body.classList.add('dwight-shake');
      setTimeout(() => document.body.classList.remove('dwight-shake'), 480);
      addMiles(40, 'dwight summoned');
      awardAchievement('dwight-typed', 'IDENTITY THEFT IS NOT A JOKE!', 200);
    }
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
      awardAchievement('tristate-typed', 'Tri-State Area in jeopardy!', 100);
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
  // Detonation has consequences — Tom Nook's loan office takes a 1,000 mile
  // hit out of your account. Toast fires before the page goes black.
  addMiles(-1000, 'detonation');
  showToast('💸 −1,000 NOOK MILES', 'bankruptcy', 1800);

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
// JS-driven random pathing. Each visit: enter from a random side, walk to
// N random destinations (using the walk-cycle GIF), strike a random pose at
// each stop (look / sit-look / jump / idle), drop gifts, leave footprints,
// then exit. Click anywhere on the goose → it flies away in a panic.

const GOOSE_GIFTS = ['🥨', '🍃', '🍂', '🥚', '📰', '🌽', '🍞', '🦝', '🥜', '🌽'];

const GOOSE_SPRITES = {
  walk:    'assets/img/goose-walk.gif',
  look:    'assets/img/goose-look.gif',
  jump:    'assets/img/goose-jump.gif',
  sitLook: 'assets/img/goose-sit-look.gif',
  flyaway: 'assets/img/goose-flyaway.gif',
  idle:    'assets/img/goose-idle.gif',
};
const PAUSE_POSES = ['look', 'sitLook', 'jump', 'idle'];

let goosePanicking = false;
let cinematicActive = false;

const LIZARD_DURATION_MS = 14500; // matches lizard-king.mp3 length
const LIZARD_HOLD_MS     = 3000;  // hold the zoom for the last 3s of audio
const LIZARD_CHANCE      = 0.20;  // 1 in 5 goose clicks

function setSprite(goose, key) {
  const img = goose.querySelector('img');
  if (!img) return;
  // Cache-bust so the GIF restarts from frame 0 each swap.
  img.src = `${GOOSE_SPRITES[key]}?t=${Date.now()}`;
}

function initRogueDuck() {
  const goose = document.getElementById('rogue-duck');
  if (!goose) return;

  // Default visual is the walk-cycle GIF (legs animating). At each stop the
  // sprite swaps to one of the pause poses; on click it swaps to flyaway.
  swapToImageIfPresent(goose, [GOOSE_SPRITES.walk, 'assets/img/goose-still.png']);

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

  // Click handling: a casual click just gets a quack + small bounce. Only
  // rapid-fire clicks (3 within ~1.8s) actually scare the goose into flying
  // away. Lets visitors interact without immediately losing the bird.
  let recentClicks = [];
  const PANIC_THRESHOLD = 3;
  const PANIC_WINDOW_MS = 1800;
  goose.addEventListener('click', () => {
    if (goosePanicking || cinematicActive) return;

    // 1 in 5: rare lizard king cinematic — blackout, zoom, sound, release
    if (Math.random() < LIZARD_CHANCE) {
      lizardKingSequence(goose);
      addMiles(50, 'lizard king');
      awardAchievement('lizard-king', 'Bears. Beets. Lizard King.', 350);
      return;
    }

    const now = Date.now();
    recentClicks = recentClicks.filter((t) => now - t < PANIC_WINDOW_MS);
    recentClicks.push(now);

    if (recentClicks.length >= PANIC_THRESHOLD) {
      recentClicks = [];
      panicAndExit(goose);
      return;
    }

    // Casual interaction: quack + a tiny bounce + small mile bonus
    playQuackVarying(0.7, 1.6);
    addMiles(3, 'goose pet');
    awardAchievement('first-quack', 'First quack!', 30);
    const base = currentDirTransform(goose);
    goose.style.transition = 'transform 0.15s ease';
    goose.style.transform = `${base} scale(1.18)`;
    setTimeout(() => {
      if (!goosePanicking) goose.style.transform = base;
    }, 180);
  });

  // Reduced motion: skip the wandering; one waddle, no gifts, no footprints
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  setTimeout(() => beginGooseVisit(goose), 25_000);
}

// Rare cinematic on goose click. Phases:
//   Phase 1 (0 → ~11.5s): blackout + slow zoom from scale 1 to scale 6 on a
//                         centred, completely-still goose while the lizard
//                         king audio plays. Bg-music + Animalese muted.
//   Phase 2 (~11.5s, instant): HARD CUT to a ridiculous face zoom — scale
//                              jumps to 30, transform-origin moves onto the
//                              face so it lands at viewport centre.
//   Phase 3 (~11.5s → ~14.5s): hold the face zoom for the final 3 seconds.
//   Phase 4 (~14.5s): fade everything back, restore GIF, unmute, schedule
//                     next visit.
function lizardKingSequence(goose) {
  if (cinematicActive) return;
  cinematicActive = true;

  // Silence everything else so the lizard king audio is unobstructed.
  muteBgMusic();
  cancelAnimalese();

  // Swap the GIF for the static frame so the goose holds perfectly still.
  const gooseImg = goose.querySelector('img');
  const originalSrc = gooseImg ? gooseImg.src : null;
  if (gooseImg) gooseImg.src = 'assets/img/goose-still.png';

  const originalZ = getComputedStyle(goose).zIndex;
  const elemW = goose.offsetWidth  || 72;
  const elemH = goose.offsetHeight || 72;

  // Kill any in-flight walk transition AND override the goose's position to
  // viewport centre. The walk loop's pending setTimeout is harmless now —
  // beginGooseVisit / walkGooseTo / pauseAndAct all bail on cinematicActive.
  goose.style.transition = 'none';
  goose.style.left = `${window.innerWidth  / 2 - elemW / 2}px`;
  goose.style.top  = `${window.innerHeight / 2 - elemH / 2}px`;
  goose.style.transformOrigin = '50% 50%';
  goose.style.transform = 'scaleX(1)'; // forward-facing for the cinematic

  const blackout = document.createElement('div');
  blackout.className = 'lizard-king-blackout';
  document.body.appendChild(blackout);

  goose.style.zIndex = '500';

  // Force layout flush so the centred-state position is committed before
  // the next paint applies the long transition.
  void blackout.offsetHeight;
  void goose.offsetHeight;

  blackout.classList.add('is-on');
  playLizardKing();

  const zoomMs = LIZARD_DURATION_MS - LIZARD_HOLD_MS;

  // Phase 1 — slow zoom from scale 1 to scale 6 (no translate; goose is
  // already centred via left/top)
  goose.style.transition = `transform ${zoomMs}ms ease-in-out`;
  goose.style.transform = 'scaleX(1) scale(6)';

  // Phase 2 — hard cut to face zoom.
  // The face on the still sprite sits around 38% from the top (head/hat
  // occupies the upper third; eyes/beak are mid-head). Origin at the face,
  // translate compensates to put the face pivot at viewport centre, scale
  // 20 makes the face dominate the screen without overshooting.
  setTimeout(() => {
    if (!cinematicActive) return;
    goose.style.transition = 'none';
    goose.style.transformOrigin = '50% 38%';
    const faceTranslateY = elemH * 0.12; // (50% − 38%) of element height
    goose.style.transform = `translate(0px, ${faceTranslateY}px) scaleX(1) scale(20)`;
  }, zoomMs);

  // Phase 4 — fade back at total duration
  setTimeout(() => {
    blackout.classList.remove('is-on');
    goose.style.transition = 'transform 0.55s ease-out';
    goose.style.transformOrigin = '50% 50%';
    goose.style.transform = 'scaleX(1)';
    setTimeout(() => {
      blackout.remove();
      goose.style.zIndex = originalZ === 'auto' ? '40' : originalZ;
      if (gooseImg && originalSrc) {
        gooseImg.src = originalSrc.includes('?')
          ? originalSrc
          : `${originalSrc.split('?')[0]}?t=${Date.now()}`;
      }
      cinematicActive = false;
      unmuteBgMusic();
      // Reset goose direction so the next walk picks correctly
      goose.dataset.facing = 'right';
      // Schedule a fresh visit since the walk loop bailed during cinematic
      setTimeout(() => beginGooseVisit(goose), 30_000 + Math.random() * 60_000);
    }, 650);
  }, LIZARD_DURATION_MS);
}

// Click → goose panics, swaps to flyaway sprite, sprints off-screen,
// then waits longer than usual before the next visit.
function panicAndExit(goose) {
  goosePanicking = true;
  playQuackVarying(0.6, 1.5);
  awardAchievement('scared-goose', 'You scared the goose!', 80);
  setSprite(goose, 'flyaway');
  // Make sure the goose is "facing" its exit direction
  const exitsRight = (goose.offsetLeft + (goose.offsetWidth || 60) / 2) > window.innerWidth / 2;
  setDir(goose, exitsRight);
  // Fast translation off-screen
  const exitX = exitsRight ? window.innerWidth + 240 : -240;
  goose.style.transition = 'left 1.0s cubic-bezier(.5,.0,.7,.0), top 1.0s ease-in';
  goose.style.left = `${exitX}px`;
  goose.style.top  = `${goose.offsetTop - 80}px`; // small upward arc

  setTimeout(() => {
    goose.style.transition = 'none';
    goose.style.left = '-300px';
    goose.style.top  = '-300px';
    setSprite(goose, 'walk');
    goosePanicking = false;
    // Schedule the next visit after a longer cool-off period
    setTimeout(() => beginGooseVisit(goose), 90_000 + Math.random() * 90_000);
  }, 1100);
}

// Source sprites all face RIGHT (artist convention from the spritesheet),
// so walking left requires a horizontal flip.
function currentDirTransform(el) {
  return el.dataset.facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
}

function setDir(el, isRight) {
  el.dataset.facing = isRight ? 'right' : 'left';
  el.style.transform = isRight ? 'scaleX(1)' : 'scaleX(-1)';
}

async function beginGooseVisit(goose) {
  if (goosePanicking || cinematicActive) return;

  // Enter from a random side, vertical somewhere in the lower 70% of viewport
  const enterRight = Math.random() < 0.5;
  const startX = enterRight ? -180 : window.innerWidth + 60;
  const startY = window.innerHeight * (0.35 + Math.random() * 0.55);
  goose.style.transition = 'none';
  goose.style.left = `${startX}px`;
  goose.style.top  = `${startY}px`;
  setDir(goose, enterRight);
  setSprite(goose, 'walk');

  // Visit 4-6 random points so the goose lingers longer
  const stops = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < stops; i++) {
    if (goosePanicking || cinematicActive) return;
    await walkGooseTo(goose, randomTargetInViewport());
    if (goosePanicking || cinematicActive) return;
    await pauseAndAct(goose);
  }

  if (goosePanicking || cinematicActive) return;

  // Exit by walking offscreen on a random side
  const exitX = Math.random() < 0.5 ? -200 : window.innerWidth + 60;
  await walkGooseTo(goose, { x: exitX, y: goose.offsetTop });

  // Schedule the next visit
  const next = 60_000 + Math.random() * 90_000; // 60-150s
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
    if (goosePanicking || cinematicActive) { resolve(); return; }
    setSprite(goose, 'walk');
    const fromX = goose.offsetLeft;
    const fromY = goose.offsetTop;
    const dx = target.x - fromX;
    const dy = target.y - fromY;
    const distance = Math.hypot(dx, dy);
    const speedPxPerSec = 55 + Math.random() * 25; // 55-80 px/s slow waddle
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
    if (goosePanicking || cinematicActive) { resolve(); return; }

    // Pick a random pause pose from the sprite set so each stop looks different
    const pose = PAUSE_POSES[Math.floor(Math.random() * PAUSE_POSES.length)];
    setSprite(goose, pose);

    const r = Math.random();
    let durationMs;
    if (r < 0.40) {
      dropGift(goose);
      durationMs = 1500 + Math.random() * 600;
    } else if (r < 0.75) {
      playQuackVarying(0.85, 1.25);
      durationMs = 1200 + Math.random() * 500;
    } else {
      durationMs = 1400 + Math.random() * 700;
    }
    setTimeout(() => {
      if (!goosePanicking) setSprite(goose, 'walk');
      resolve();
    }, durationMs);
  });
}

function dropFootprint(goose) {
  const r = goose.getBoundingClientRect();
  const print = document.createElement('div');
  print.className = 'goose-footprint';
  // Place at the goose's feet (centre x, just inside its bottom edge)
  print.style.left = `${r.left + r.width / 2 - 10}px`;
  print.style.top  = `${r.top  + r.height - 6}px`;
  document.body.appendChild(print);
  requestAnimationFrame(() => { print.style.opacity = '0'; });
  setTimeout(() => print.remove(), 4500);
}

function dropGift(goose) {
  const r = goose.getBoundingClientRect();
  const gift = document.createElement('div');
  gift.className = 'goose-gift';
  gift.textContent = GOOSE_GIFTS[Math.floor(Math.random() * GOOSE_GIFTS.length)];
  gift.style.left = `${r.left + r.width / 2 - 14}px`;
  gift.style.top  = `${r.top  + r.height - 18}px`;
  document.body.appendChild(gift);
  setTimeout(() => { gift.style.opacity = '0'; }, 6000);
  setTimeout(() => gift.remove(), 12000);
}

// Replace the goose element's contents with an <img> if a sprite is present.
// Accepts a string path or an array of candidate paths (tried in order).
// Falls back silently to whatever it already shows (the duck emoji).
function swapToImageIfPresent(el, src) {
  const candidates = Array.isArray(src) ? src.slice() : [src];
  const tryNext = () => {
    if (!candidates.length) return;
    const path = candidates.shift();
    const img = new Image();
    img.onload = () => {
      el.replaceChildren();
      img.style.height = '72px';
      img.style.width = 'auto';
      img.style.display = 'block';
      img.style.pointerEvents = 'none';
      img.style.imageRendering = 'pixelated';
      img.alt = '';
      el.appendChild(img);
      el.style.fontSize = '0';
    };
    img.onerror = tryNext;
    img.src = path;
  };
  tryNext();
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
