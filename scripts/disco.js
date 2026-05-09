// 🪩 Disco Ball — toggleable site-wide club mode.
//
// On enter:
//   - Cancel any in-flight animalese typing.
//   - Mute the bg-music loop, stop the KK-airline loop.
//   - Set the audio.js disco flag so all SFX (easter eggs, slot, etc.)
//     are suppressed for the duration.
//   - Start Harry Styles on loop. Harry is played by THIS module directly
//     (not via audio.js helpers, which are now muted) so he gets through.
//   - Add body class `disco-active`: dims the page via overlay, shows the
//     spinning disco ball + 5 colored radial-gradient spotlights drifting
//     across the page (slow eased motion — explicitly NOT strobe).
//
// On exit (click sticker again, ESC, or end of song if user later wants
// auto-exit): stop Harry, clear the flag, unmute bg, restore everything.

import { setDiscoActive } from './audio.js';
import { cancelAnimalese } from './animalese.js';
import { pauseAll as pauseBg, resumeActive as resumeBg } from './bg-music.js';
import { stopKK } from './audio.js';
import { showToast } from './toast.js';

const HARRY_SRC = 'assets/audio/harry-styles.mp3';

let active = false;
let harry = null;

export function initDisco() {
  ensureOverlay();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && active) exitDiscoMode();
  });
}

// Called from shop-interactivity routing on disco-ball sticker click.
export function toggleDiscoMode() {
  if (active) exitDiscoMode();
  else enterDiscoMode();
}

function enterDiscoMode() {
  if (active) return;
  active = true;

  // Order matters: flag FIRST so any in-flight SFX guards activate before
  // we cancel typers / pause tracks. Then kill bg + KK loop instantly (no
  // fade — pauseBg actually pauses rather than fading to volume 0).
  setDiscoActive(true);
  cancelAnimalese();
  try { pauseBg(); } catch {}
  try { stopKK(); } catch {}

  document.body.classList.add('disco-active');

  // Harry plays directly through a fresh Audio element so the disco-mute
  // guard in audio.js doesn't affect him. Volume up — this is a club.
  harry = new Audio(HARRY_SRC);
  harry.loop = true;
  harry.volume = 1.0;
  harry.preload = 'auto';
  const p = harry.play();
  if (p && typeof p.catch === 'function') {
    p.catch(() => {
      // Autoplay can be blocked on first load. Prompt the user that we
      // need a gesture, then play on the next interaction.
      showToast('🪩 Tap anywhere to start Harry', 'info', 3500);
      const onGesture = () => {
        document.removeEventListener('pointerdown', onGesture, true);
        document.removeEventListener('keydown',     onGesture, true);
        if (active && harry) harry.play().catch(() => {});
      };
      document.addEventListener('pointerdown', onGesture, { capture: true, once: true });
      document.addEventListener('keydown',     onGesture, { capture: true, once: true });
    });
  }

  showToast('🪩 Disco mode ON. Click the ball or press ESC to exit.', 'success', 3500);
}

function exitDiscoMode() {
  if (!active) return;
  active = false;

  if (harry) {
    try { harry.pause(); harry.currentTime = 0; } catch {}
    harry = null;
  }

  setDiscoActive(false);
  try { resumeBg(); } catch {}
  document.body.classList.remove('disco-active');

  showToast('🪩 House lights up. Catch you later.', 'info', 2500);
}

// === Overlay scaffold ===

function ensureOverlay() {
  if (document.getElementById('disco-overlay')) return;
  const o = document.createElement('div');
  o.id = 'disco-overlay';
  o.className = 'disco-overlay';
  o.setAttribute('aria-hidden', 'true');

  for (let i = 1; i <= 5; i++) {
    const spot = document.createElement('div');
    spot.className = `disco-spotlight s${i}`;
    o.appendChild(spot);
  }

  // The ball itself doubles as a click-to-exit affordance.
  const ball = document.createElement('button');
  ball.type = 'button';
  ball.id = 'disco-ball';
  ball.className = 'disco-ball';
  ball.setAttribute('aria-label', 'Exit disco mode');
  ball.title = 'Click the ball to exit';
  ball.textContent = '🪩';
  ball.addEventListener('click', exitDiscoMode);
  o.appendChild(ball);

  document.body.appendChild(o);
}
