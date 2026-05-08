// Background music with two tracks + cross-fade.
//
// Tracks:
//   ground — AC main theme, plays whenever Chloe is on the ground
//            (pre-trip, layover, arrived).
//   air    — Dodo Airlines theme, plays whenever she is in-flight.
//
// API:
//   start(initialKey)      Begin playback. Defaults to 'ground'. If autoplay
//                          is blocked, queues for first user gesture.
//   crossFadeTo(key)       Cross-fade to the named track. ~1.5s overlap.
//   duck()/unduck()        Refcounted ducking around sound effects.
//   mute()/unmute()        Global mute (the floating toggle button).
//   silence()              Permanent stop (post-explosion).
//   isMuted()              Returns the current mute state.

const SOURCES = {
  ground: 'assets/audio/bg-music.mp3',
  air:    'assets/audio/kk-airline.mp3',
};

const NORMAL_VOL   = 0.32;
const DUCK_VOL     = 0.06;
const FADE_DOWN_MS = 180;
const FADE_UP_MS   = 900;
const CROSSFADE_MS = 1500;

const tracks = {};
const fadeTimers = new Map();
let activeKey = null;
let duckCount = 0;
let silenced  = false;
let muted     = false;

function ensureTracks() {
  for (const [key, src] of Object.entries(SOURCES)) {
    if (tracks[key]) continue;
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0;
    audio.preload = 'auto';
    tracks[key] = audio;
  }
}

function attemptPlay(audio) {
  if (silenced || !audio) return;
  const p = audio.play();
  if (p && p.catch) {
    p.catch(() => {
      // Autoplay blocked — retry on first user gesture
      const cleanup = () => {
        document.removeEventListener('pointerdown', onGesture, true);
        document.removeEventListener('keydown',     onGesture, true);
        document.removeEventListener('touchstart',  onGesture, true);
      };
      const onGesture = () => {
        cleanup();
        if (!silenced) audio.play().catch(() => {});
      };
      document.addEventListener('pointerdown', onGesture, { capture: true, once: true });
      document.addEventListener('keydown',     onGesture, { capture: true, once: true });
      document.addEventListener('touchstart',  onGesture, { capture: true, once: true });
    });
  }
}

function fadeTo(audio, target, durationMs) {
  if (!audio) return;
  const existing = fadeTimers.get(audio);
  if (existing) clearInterval(existing);
  const startVol = audio.volume;
  const startTime = Date.now();
  const timer = setInterval(() => {
    if (silenced) { clearInterval(timer); fadeTimers.delete(audio); return; }
    const t = Math.min(1, (Date.now() - startTime) / durationMs);
    audio.volume = Math.max(0, Math.min(1, startVol + (target - startVol) * t));
    if (t >= 1) {
      clearInterval(timer);
      fadeTimers.delete(audio);
    }
  }, 16);
  fadeTimers.set(audio, timer);
}

function targetVolForActive() {
  if (muted) return 0;
  if (duckCount > 0) return DUCK_VOL;
  return NORMAL_VOL;
}

export function start(initialKey = 'ground') {
  if (silenced) return;
  ensureTracks();
  activeKey = initialKey in tracks ? initialKey : 'ground';
  attemptPlay(tracks[activeKey]);
  fadeTo(tracks[activeKey], targetVolForActive(), FADE_UP_MS);
}

export function crossFadeTo(key) {
  if (silenced) return;
  ensureTracks();
  if (activeKey === key) return;
  const next = tracks[key];
  const prev = activeKey ? tracks[activeKey] : null;
  if (!next) return;

  // Bring up the next track
  next.currentTime = 0;
  attemptPlay(next);
  fadeTo(next, targetVolForActive(), CROSSFADE_MS);

  // Take the previous one down, then pause to free CPU
  if (prev) {
    fadeTo(prev, 0, CROSSFADE_MS);
    setTimeout(() => {
      if (silenced) return;
      try { prev.pause(); prev.currentTime = 0; } catch {}
    }, CROSSFADE_MS + 60);
  }

  activeKey = key;
}

export function silence() {
  silenced = true;
  for (const t of fadeTimers.values()) clearInterval(t);
  fadeTimers.clear();
  for (const k in tracks) {
    try { tracks[k].pause(); } catch {}
  }
}

export function mute() {
  if (silenced) return;
  muted = true;
  if (activeKey) fadeTo(tracks[activeKey], 0, 240);
}

export function unmute() {
  if (silenced) return;
  muted = false;
  if (activeKey) fadeTo(tracks[activeKey], targetVolForActive(), 600);
}

export function isMuted() { return muted; }

export function duck() {
  if (silenced || muted) return;
  duckCount += 1;
  if (activeKey) fadeTo(tracks[activeKey], DUCK_VOL, FADE_DOWN_MS);
}

export function unduck() {
  if (silenced || muted) return;
  duckCount = Math.max(0, duckCount - 1);
  if (duckCount === 0 && activeKey) {
    fadeTo(tracks[activeKey], NORMAL_VOL, FADE_UP_MS);
  }
}
