// Audio helpers. Files are looked up under assets/audio/.
// If a file is missing, playback is silently skipped — the site stays functional
// without the audio assets.

import { duck, unduck } from './bg-music.js';

const SOURCES = {
  perryyy:     'assets/audio/perryyy.mp3',
  perryTheme:  'assets/audio/perry-theme.mp3',
  quack:       'assets/audio/quack.mp3',
  kkAirline:   'assets/audio/kk-airline.mp3',
  bomboclaat:  'assets/audio/bomboclaat.mp3',
  miBombo:     'assets/audio/mi-bombo.mp3',
  explosion:   'assets/audio/explosion.mp3',
  creeperHiss: 'assets/audio/creeper-hiss.mp3',
  doofJingle:  'assets/audio/doof-jingle.mp3',
  lizardKing:  'assets/audio/lizard-king.mp3',
  dwightSlut:  'assets/audio/dwight-slut.mp3',
  twss:        'assets/audio/twss.mp3',
};

const cache = {};
let kkLoop = null;

function load(key) {
  if (cache[key]) return cache[key];
  try {
    const audio = new Audio(SOURCES[key]);
    // 'auto' so iOS can buffer ahead — 'none' meant playback was blocked
    // until the file loaded, which compounded the unlock issue.
    audio.preload = 'auto';
    cache[key] = audio;
    return audio;
  } catch {
    return null;
  }
}

// iOS Safari / Brave-iOS unlock: each NEW Audio() instance needs its own
// gesture to unlock. Cloning per call broke playback after the first tap.
// Every play* function now reuses the cached instance directly so the
// unlock survives. Trade-off: rapid concurrent plays of the SAME sound
// restart instead of overlap, which is fine for short SFX.
export function playPerry() {
  const audio = load('perryyy');
  if (audio) tryPlay(audio, () => fallbackBeep(880, 0.12));
  else fallbackBeep(880, 0.12);
}

export function playPerryTheme() {
  const audio = load('perryTheme');
  if (audio) tryPlay(audio, fallbackMelody);
  else fallbackMelody();
}

export function playQuack() {
  const audio = load('quack');
  if (audio) {
    audio.playbackRate = 1;
    tryPlay(audio, () => fallbackBeep(220, 0.18));
  } else fallbackBeep(220, 0.18);
}

export function playQuackVarying(min = 0.75, max = 1.4) {
  const audio = load('quack');
  if (!audio) {
    fallbackBeep(180 + Math.random() * 120, 0.18);
    return;
  }
  audio.playbackRate = min + Math.random() * (max - min);
  tryPlay(audio, () => fallbackBeep(180 + Math.random() * 120, 0.18));
}

export function playBomboclaat() {
  const audio = load('bomboclaat');
  if (audio) tryPlay(audio, () => fallbackBeep(110, 0.5));
  else fallbackBeep(110, 0.5);
}

// === iOS audio unlock primer ===
// Call this from inside a confirmed user-gesture handler (e.g., the splash
// dismissal). It triggers a silent play() on every cached audio element so
// each one is "unlocked" by the gesture. After this, future timer-driven
// plays succeed on iOS without needing another tap. Heavy tracks
// (kk-airline) are skipped — the bg-music module handles those itself.
let warmedUpAudio = false;
const WARMUP_SKIP = new Set(['kkAirline']);
export function warmUpAudio() {
  if (warmedUpAudio) return;
  warmedUpAudio = true;
  for (const key of Object.keys(SOURCES)) {
    if (WARMUP_SKIP.has(key)) continue;
    const audio = load(key);
    if (!audio) continue;
    const wasMuted = audio.muted;
    audio.muted = true;
    const p = audio.play();
    if (p && p.then) {
      p.then(() => {
        try { audio.pause(); audio.currentTime = 0; } catch {}
        audio.muted = wasMuted;
      }).catch(() => { audio.muted = wasMuted; });
    }
  }
}

// === Animalese: short pitched blip per character, à la AC dialogue ===
//
// Each letter gets a low-octave square-wave blip whose pitch varies in a
// pentatonic scale based on the character. Tom Nook gets a deeper voice; this
// is tuned around G3 so it reads as "raccoon shopkeeper" not "chipmunk".
const PENTATONIC = [0, 2, 4, 7, 9];
export function playNookAnimaleseChar(char) {
  if (!/[a-zA-Z]/.test(char)) return;
  const c = ac(); if (!c) return;
  // Resume if the context is suspended (autoplay policy)
  if (c.state === 'suspended' && c.resume) c.resume().catch(() => {});
  // Per-char animalese blips would thrash the duck refcount; the Animalese
  // module ducks once around the entire phrase via Audio() instead.
  try {
    const code = char.toLowerCase().charCodeAt(0) - 97;
    const semitones = PENTATONIC[Math.abs(code) % PENTATONIC.length] - 5;
    const pitch = 196 /* G3 */ * Math.pow(2, semitones / 12);

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.value = pitch;

    const t = c.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.04, t + 0.005); // -20% from 0.05
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  } catch { /* ignore — context may not be ready */ }
}

// === Mi bombo: drum-roll-style anticipation cue ===
export function playMiBombo() {
  const audio = load('miBombo');
  if (audio) { tryPlay(audio); return; }
  duckFor(8 * 180 + 100);
  for (let i = 0; i < 8; i++) {
    setTimeout(() => fallbackBeep(60 + i * 8, 0.07), i * 180);
  }
}

// === Creeper hiss: build-up before the boom ===
export function playCreeperHiss() {
  const audio = load('creeperHiss');
  if (audio) {
    tryPlay(audio);
    return audio;
  }
  const c = ac(); if (!c) return null;
  duckFor(2500);
  const len = Math.floor(c.sampleRate * 2.8);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const ramp = i / len;
    data[i] = (Math.random() * 2 - 1) * 0.25 * ramp;
  }
  const noise = c.createBufferSource();
  noise.buffer = buf;
  noise.connect(c.destination);
  noise.start();
  return null;
}

// === Lizard king: rare goose-click cinematic cue ===
export function playLizardKing() {
  const audio = load('lizardKing');
  if (!audio) { fallbackBeep(220, 0.5); return null; }
  tryPlay(audio);
  return audio;
}

// === Dwight, you ignorant slut: typing trigger cue ===
export function playDwightSlut() {
  const audio = load('dwightSlut');
  if (!audio) { fallbackBeep(440, 0.3); return; }
  tryPlay(audio, () => fallbackBeep(440, 0.3));
}

// === That's what she said: typing trigger + Nook-announcement follow-up ===
export function playTwss() {
  const audio = load('twss');
  if (!audio) { fallbackBeep(380, 0.4); return; }
  tryPlay(audio, () => fallbackBeep(380, 0.4));
}

// === Doof jingle: plays when the Doof overlay opens ===
//
// On the very first page load, browsers usually block autoplay until the
// user has interacted. If that happens, we register a one-time pointerdown
// /keydown listener so the jingle fires the moment they engage (often the
// click/key that dismisses the overlay).
let doofJingleQueued = false;
export function playDoofJingle() {
  const audio = load('doofJingle');
  if (!audio) { fallbackMelody(); return; }

  const playOnce = () => {
    tryPlay(audio, () => {
      if (doofJingleQueued) return;
      doofJingleQueued = true;
      const onGesture = () => {
        document.removeEventListener('pointerdown', onGesture, true);
        document.removeEventListener('keydown', onGesture, true);
        doofJingleQueued = false;
        playOnce();
      };
      document.addEventListener('pointerdown', onGesture, { capture: true, once: true });
      document.addEventListener('keydown',     onGesture, { capture: true, once: true });
    });
  };

  playOnce();
}

// === Explosion: white-noise burst ===
export function playExplosion() {
  const audio = load('explosion');
  if (audio) { tryPlay(audio); return; }
  const c = ac(); if (!c) return;
  duckFor(1500);
  const len = Math.floor(c.sampleRate * 1.4);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    // Loud at start, decay quadratically
    const decay = Math.pow(1 - i / len, 2);
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const gain = c.createGain();
  gain.gain.value = 0.6;
  noise.connect(gain).connect(c.destination);
  noise.start();
}

export function startKK() {
  if (kkLoop) return;
  const audio = load('kkAirline');
  if (!audio) return;
  const instance = audio.cloneNode();
  instance.loop = true;
  instance.volume = 0.25;
  tryPlay(instance);
  kkLoop = instance;
}

export function stopKK() {
  if (!kkLoop) return;
  try { kkLoop.pause(); kkLoop.currentTime = 0; } catch {}
  kkLoop = null;
}

function tryPlay(audio, onFail) {
  // If a previous tryPlay is still tracking this audio (i.e. we're calling
  // again before the last one ended), release its duck count + listeners
  // first so a rapid replay doesn't leak.
  if (audio._releaseFn) audio._releaseFn();

  duck();
  let released = false;

  const onEnded = () => release();
  const onError = () => { release(); if (onFail) onFail(); };
  const onPause = () => release();

  const release = () => {
    if (released) return;
    released = true;
    audio.removeEventListener('ended', onEnded);
    audio.removeEventListener('error', onError);
    audio.removeEventListener('pause', onPause);
    if (audio._releaseFn === release) audio._releaseFn = null;
    unduck();
  };
  audio._releaseFn = release;

  audio.addEventListener('ended', onEnded);
  audio.addEventListener('error', onError);
  audio.addEventListener('pause', onPause);

  // Reset to start so a replay restarts cleanly even if mid-playback.
  try { audio.currentTime = 0; } catch {}

  const p = audio.play();
  if (p && typeof p.catch === 'function') {
    p.catch(() => { release(); if (onFail) onFail(); });
  }
}

// Manual duck for synthesised (Web Audio) sounds that don't fire DOM events.
function duckFor(durationMs) {
  duck();
  setTimeout(unduck, durationMs);
}

// === WebAudio fallbacks for when no .mp3 files are present ===
let ctx = null;
function ac() {
  if (ctx) return ctx;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  return ctx;
}

function fallbackBeep(freq, duration) {
  const c = ac(); if (!c) return;
  if (c.state === 'suspended' && c.resume) c.resume().catch(() => {});
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.frequency.value = freq;
  osc.type = 'triangle';
  gain.gain.value = 0.18;
  osc.connect(gain).connect(c.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.stop(c.currentTime + duration);
}

function fallbackMelody() {
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
  notes.forEach((n, i) => setTimeout(() => fallbackBeep(n, 0.15), i * 130));
}
