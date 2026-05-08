// Resetti scold: shown on the next page load after the user detonated the site.
// Reads a localStorage flag set by the bomb sequence; clears it on dismissal.

import { typeAnimalese } from './animalese.js';

const FLAG_KEY = 'whereischloe.bombed';

// Original fan-style rebuke written for the bombed-website scenario.
// Resetti stylistic cues only (capslock, address terms, "letting you off")
// — no copy of actual game dialogue.
const RANT = [
  "YOU. YEAH, YOU, KID.",
  "DON'T TURN AWAY. LOOK AT ME.",
  "YA THOUGHT IT'D BE FUNNY TO TYPE 'BOMB' AND DETONATE THE WHOLE WEBSITE?? IS THAT IT?? WELL CONGRATULATIONS, BUDDY. YA DID IT.",
  "YA ALSO BLEW UP CHLOE'S PLANE.",
  "CHLOE WAS ON THAT PLANE, KID. ALASKA AIRLINES. REAL AIRCRAFT, REAL FUEL, REAL ENGINES, REAL — WELL YA GET THE PICTURE. AND YA JUST WENT AHEAD AND. POOF. UP IT GOES.",
  "I HAVE BEEN ON HOLIDAY FOR FIFTEEN MINUTES. FIFTEEN! AND ALREADY YA PULLED THIS STUNT.",
  "LISTEN. I'M LETTIN' YA OFF WITH A WARNING. ONE WARNING. IF I CATCH YA TYPIN' THAT WORD AGAIN — AND I WILL CATCH YA, I HAVE TUNNELS EVERYWHERE — I'M SHOWIN' UP IN PERSON. WITH A SHOVEL. JUST ASK THE TURNIPS, BUB.",
  "NOW APOLOGISE AND CLICK THE BUTTON. I'VE GOT A BEACH TO GET BACK TO.",
];

// Set the flag — called from easter-eggs.js detonate().
export function flagBombed() {
  try { localStorage.setItem(FLAG_KEY, '1'); } catch {}
}

// Returns true if a scold is owed and hasn't been dismissed yet.
export function isOwed() {
  try { return localStorage.getItem(FLAG_KEY) === '1'; } catch { return false; }
}

function clearFlag() {
  try { localStorage.removeItem(FLAG_KEY); } catch {}
}

// Show the overlay and resolve the returned promise once the user dismisses.
export function showScold() {
  return new Promise((resolve) => {
    const overlay = document.getElementById('resetti-overlay');
    const rantEl  = document.getElementById('resetti-rant');
    const btn     = document.getElementById('resetti-dismiss');
    if (!overlay || !rantEl || !btn) {
      clearFlag();
      resolve();
      return;
    }

    overlay.classList.add('is-open');
    rantEl.replaceChildren();
    btn.disabled = true;
    btn.classList.add('is-waiting');

    // Type each paragraph in sequence with Animalese for that AC dialogue feel.
    let i = 0;
    const next = () => {
      if (i >= RANT.length) {
        btn.disabled = false;
        btn.classList.remove('is-waiting');
        return;
      }
      const p = document.createElement('p');
      p.className = 'resetti-line';
      rantEl.appendChild(p);
      typeAnimalese(p, RANT[i], { pitch: 0.7 }); // even deeper than Tom Nook for Resetti
      // Time the next paragraph to start once this one finishes typing.
      const ms = RANT[i].length * 75 + 350;
      i += 1;
      setTimeout(next, ms);
    };
    next();

    const onDismiss = () => {
      btn.removeEventListener('click', onDismiss);
      overlay.classList.remove('is-open');
      clearFlag();
      resolve();
    };
    btn.addEventListener('click', onDismiss);
  });
}
