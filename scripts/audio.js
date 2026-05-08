// Audio helpers. Files are looked up under assets/audio/.
// If a file is missing, playback is silently skipped — the site stays functional
// without the audio assets.

const SOURCES = {
  perryyy:    'assets/audio/perryyy.mp3',
  perryTheme: 'assets/audio/perry-theme.mp3',
  quack:      'assets/audio/quack.mp3',
  kkAirline:  'assets/audio/kk-airline.mp3',
  bomboclaat: 'assets/audio/bomboclaat.mp3',
};

const cache = {};
let kkLoop = null;

function load(key) {
  if (cache[key]) return cache[key];
  try {
    const audio = new Audio(SOURCES[key]);
    audio.preload = 'none';
    cache[key] = audio;
    return audio;
  } catch {
    return null;
  }
}

export function playPerry() {
  const audio = load('perryyy');
  if (audio) tryPlay(audio.cloneNode());
  else fallbackBeep(880, 0.12);
}

export function playPerryTheme() {
  const audio = load('perryTheme');
  if (audio) tryPlay(audio.cloneNode());
  else fallbackMelody();
}

export function playQuack() {
  const audio = load('quack');
  if (audio) tryPlay(audio.cloneNode());
  else fallbackBeep(220, 0.18);
}

export function playBomboclaat() {
  const audio = load('bomboclaat');
  if (audio) tryPlay(audio.cloneNode());
  else fallbackBeep(110, 0.5); // deep rumble fallback
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

function tryPlay(audio) {
  const p = audio.play();
  if (p && typeof p.catch === 'function') p.catch(() => { /* autoplay blocked, ignore */ });
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
