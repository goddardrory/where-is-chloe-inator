// Background music with auto-duck.
//
// `start()`     — begin looping playback at NORMAL_VOL (or queue for first user
//                 gesture if autoplay is blocked).
// `duck()`      — refcount-up; each call lowers volume to DUCK_VOL.
//                 Use it before playing any other sound.
// `unduck()`    — refcount-down; when count returns to 0, fade back up.
// `silence()`   — permanent stop. Used post-explosion. No way back without a
//                 page reload.

const SRC = 'assets/audio/bg-music.mp3';
const NORMAL_VOL = 0.32;
const DUCK_VOL   = 0.06;
const FADE_DOWN_MS = 180;
const FADE_UP_MS   = 900;

let audio = null;
let duckCount = 0;
let silenced = false;
let fadeTimer = null;

export function start() {
  if (silenced) return;
  if (!audio) {
    audio = new Audio(SRC);
    audio.loop = true;
    audio.volume = NORMAL_VOL;
    audio.preload = 'auto';
  }
  const tryPlay = () => audio && audio.play().catch(() => false);
  const p = tryPlay();
  if (!p) return;
  p.then((ok) => {
    if (ok === false) {
      // Autoplay blocked — wait for first interaction
      const onGesture = () => {
        cleanupGestureListeners();
        tryPlay();
      };
      const cleanupGestureListeners = () => {
        document.removeEventListener('pointerdown', onGesture, true);
        document.removeEventListener('keydown',     onGesture, true);
        document.removeEventListener('touchstart',  onGesture, true);
      };
      document.addEventListener('pointerdown', onGesture, { once: true, capture: true });
      document.addEventListener('keydown',     onGesture, { once: true, capture: true });
      document.addEventListener('touchstart',  onGesture, { once: true, capture: true });
    }
  });
}

export function duck() {
  if (!audio || silenced) return;
  duckCount += 1;
  fadeTo(DUCK_VOL, FADE_DOWN_MS);
}

export function unduck() {
  if (!audio || silenced) return;
  duckCount = Math.max(0, duckCount - 1);
  if (duckCount === 0) fadeTo(NORMAL_VOL, FADE_UP_MS);
}

export function silence() {
  silenced = true;
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
  if (audio) {
    try { audio.pause(); } catch {}
    audio = null;
  }
}

function fadeTo(targetVol, durationMs) {
  if (!audio) return;
  if (fadeTimer) clearInterval(fadeTimer);
  const startVol = audio.volume;
  const startTime = Date.now();
  fadeTimer = setInterval(() => {
    if (!audio) { clearInterval(fadeTimer); fadeTimer = null; return; }
    const t = Math.min(1, (Date.now() - startTime) / durationMs);
    audio.volume = startVol + (targetVol - startVol) * t;
    if (t >= 1) { clearInterval(fadeTimer); fadeTimer = null; }
  }, 16);
}
