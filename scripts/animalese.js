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
let activeTimer = null;
let activeAudio = null;
let activeTarget = null;

// Lazily initialise the Acedio engine. Cheap to call repeatedly.
function ensureAcedio() {
  if (acedioReady || acedioFailed) return;
  if (typeof window === 'undefined' || typeof window.Animalese !== 'function') {
    acedioFailed = true;
    return;
  }
  try {
    acedio = new window.Animalese('scripts/vendor/animalese/animalese.wav', () => {
      acedioReady = true;
    });
  } catch {
    acedioFailed = true;
  }
}

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
    const audio = new Audio(wave.dataURI);
    audio.volume = 0.5;
    duck();
    let released = false;
    const release = () => { if (!released) { released = true; unduck(); } };
    audio.addEventListener('ended', release, { once: true });
    audio.addEventListener('error', release, { once: true });
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
