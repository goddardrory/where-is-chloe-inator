// Type text into an element character-by-character, like Animal Crossing
// dialogue, with synced Animalese audio.
//
// Primary path: Acedio's animalese.js library (loaded as a global before this
// module). It pre-bakes a 26-letter sample library and synthesises a full WAV
// for the whole quote — we play that and time the typewriter to match.
//
// Fallback: per-character synth blip via Web Audio.

import { playNookAnimaleseChar } from './audio.js';
import { duck, unduck } from './bg-music.js';

// Acedio lib output is a fixed 0.075s per character regardless of pitch.
const ACEDIO_MS_PER_CHAR = 75;
// Tom Nook's deeper voice — pitch < 1.0 makes the source samples read more
// slowly, giving a lower / gravellier tone.
const NOOK_PITCH = 0.85;

const SYNTH_SPEED_MS = 36;

let acedio = null;
let acedioReady = false;
let acedioFailed = false;
let acedioReadyPromise = null;
let activeTimer = null;
let activeAudio = null;
let activeTarget = null;

// Begin loading Acedio's letter library NOW. Idempotent — repeat calls return
// the same promise. Resolves true on success, false if the lib isn't present.
export function preloadAcedio() {
  if (acedioReadyPromise) return acedioReadyPromise;
  if (typeof window === 'undefined' || typeof window.Animalese !== 'function') {
    acedioFailed = true;
    acedioReadyPromise = Promise.resolve(false);
    return acedioReadyPromise;
  }
  acedioReadyPromise = new Promise((resolve) => {
    try {
      acedio = new window.Animalese('scripts/vendor/animalese/animalese.wav', () => {
        acedioReady = true;
        resolve(true);
      });
    } catch {
      acedioFailed = true;
      resolve(false);
    }
  });
  return acedioReadyPromise;
}

// Resolves when Acedio is ready (or has failed — either way callers can proceed).
export function whenAcedioReady() {
  return preloadAcedio();
}

// Backwards-compat shim used in typeAnimalese.
function ensureAcedio() { preloadAcedio(); }

export function cancelAnimalese() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
  if (activeAudio) {
    try { activeAudio.pause(); activeAudio.currentTime = 0; } catch {}
    activeAudio = null;
  }
  activeTarget = null;
}

export function typeAnimalese(el, text, opts = {}) {
  if (!el) return;
  cancelAnimalese();
  ensureAcedio();
  activeTarget = el;
  el.textContent = '';

  if (acedioReady && acedio) {
    typeWithAcedio(el, text, opts);
  } else {
    typeWithSynth(el, text, opts);
  }
}

// === Acedio path: one big audio file, typewriter timed to its cadence ===
//
// iOS / Safari / Brave-iOS gotcha: each NEW Audio() instance requires its
// own user-gesture unlock. Cloning or recreating per phrase means only the
// first one after a tap plays. Solution: use a single persistent audio
// element that gets unlocked once on the first user gesture and then has
// its `src` swapped per phrase. The same element keeps its unlock state.
let persistentAcedioAudio = null;
function getPersistentAcedioAudio() {
  if (persistentAcedioAudio) return persistentAcedioAudio;
  const a = new Audio();
  a.volume = 0.4;
  a.preload = 'auto';
  persistentAcedioAudio = a;
  return a;
}

function typeWithAcedio(el, text, opts) {
  const pitch = opts.pitch ?? NOOK_PITCH;

  let wave;
  try {
    wave = acedio.Animalese(text, false, pitch);
  } catch {
    typeWithSynth(el, text, opts);
    return;
  }

  if (wave && wave.dataURI) {
    const audio = getPersistentAcedioAudio();
    // Halt any in-flight playback before swapping src so iOS doesn't choke.
    try { audio.pause(); audio.currentTime = 0; } catch {}
    audio.src = wave.dataURI;
    duck();
    let released = false;
    const release = () => { if (!released) { released = true; unduck(); } };
    audio.onended = release;
    audio.onerror = release;
    audio.play().catch(release);
    activeAudio = audio;
  }

  let i = 0;
  activeTimer = setInterval(() => {
    if (i >= text.length || el !== activeTarget) {
      cancelAnimalese();
      return;
    }
    i += 1;
    el.textContent = text.slice(0, i);
  }, ACEDIO_MS_PER_CHAR);
}

// === Synth fallback: per-character blip while typing ===
function typeWithSynth(el, text, opts) {
  const speed = opts.speed ?? SYNTH_SPEED_MS;
  let letterTicks = 0;
  let i = 0;
  activeTimer = setInterval(() => {
    if (i >= text.length || el !== activeTarget) {
      cancelAnimalese();
      return;
    }
    const ch = text[i];
    el.textContent = text.slice(0, i + 1);
    if (/[a-zA-Z]/.test(ch)) {
      if (letterTicks % 2 === 0) playNookAnimaleseChar(ch);
      letterTicks++;
    }
    i++;
  }, speed);
}
