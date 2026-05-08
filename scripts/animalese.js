// Type text into an element character-by-character, like Animal Crossing
// dialogue. Plays an Animalese blip per letter for the AC vibe.

import { playNookAnimaleseChar } from './audio.js';

const DEFAULT_SPEED_MS = 36; // ms per character; AC sits around 30-45ms
let activeTimer = null;
let activeTarget = null;

// Cancel any in-progress animation. Used so a second invocation interrupts
// cleanly rather than two typewriters racing on the same element.
export function cancelAnimalese() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
    activeTarget = null;
  }
}

export function typeAnimalese(el, text, opts = {}) {
  if (!el) return;
  cancelAnimalese();

  const speed = opts.speed ?? DEFAULT_SPEED_MS;
  el.textContent = '';
  activeTarget = el;

  // Track of how many "letter ticks" we've played to throttle audio (every 2nd
  // letter sounds closer to AC's actual cadence and is less fatiguing).
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
