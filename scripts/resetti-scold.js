// Resetti scold: shown on the next page load after the user detonated the
// site. Escalates over 5 levels as they keep doing it.
//
// localStorage:
//   whereischloe.bombCount  — total times bombed (never auto-resets)
//   whereischloe.bombOwed   — '1' if a scold is queued for next load

import { typeAnimalese } from './animalese.js';

const COUNT_KEY = 'whereischloe.bombCount';
const OWED_KEY  = 'whereischloe.bombOwed';

// Original fan-style rants written in Resetti's stylistic register
// (capslock yelling, "kid"/"pal"/"bub" address terms, his "I'm-letting-ya-off"
// trope). Each level escalates: tone, length, fragmentation, chaos.
const RANTS = [
  // === Level 1 — mildly annoyed ===
  [
    "You. Yeah, you, kid.",
    "We need to have a little chat.",
    "I saw what you did. Typing 'bomb' and blowing up the whole website? Tch.",
    "Now look — I get it. Curiosity got the better of ya. Fingers got bored.",
    "But CHLOE was on that plane, bub. Real flight. Real engines. Poof.",
    "I'm lettin' ya off easy this time. Just this once. Don't make me come back, alright?",
  ],
  // === Level 2 — warming up ===
  [
    "YOU AGAIN??",
    "KID. I JUST GOT BACK TO MY BEACH. FIFTEEN MINUTES IS ALL I WAS ASKIN' FOR.",
    "AND HERE YA ARE. TYPING 'BOMB'. AGAIN. INTENTIONALLY THIS TIME.",
    "Did ya LEARN nothing from our last chat?? Did Chloe's plane mean NOTHIN' to you?",
    "I have TUNNELS right under this website, kid. RIGHT. UNDER.",
    "Apologise. Properly. And don't make me come back a third time, ya hear??",
  ],
  // === Level 3 — full anger ===
  [
    "ARE. YOU. KIDDING. ME.",
    "THREE TIMES?? THREE TIMES, BUDDY???",
    "I HAVE BEEN ON HOLIDAY FOR ALL OF NEGATIVE FORTY-FIVE MINUTES NOW. BECAUSE OF YOU.",
    "MY BEACH UMBRELLA HAS WILTED. WILTED, KID. I HOPE YOU'RE PROUD.",
    "CHLOE'S PLANE?? GONE. AGAIN. I AM TIRED OF EXPLAININ' THIS, BUB.",
    "I AM PUTTING YOU ON A LIST. A SPECIFIC, NAMED, MOLE-MAINTAINED LIST.",
    "YOU TYPE THAT WORD ONE MORE TIME — ONE MORE — AND I'M DIGGIN' THROUGH YOUR MONITOR.",
  ],
  // === Level 4 — unhinged ===
  [
    "WHA—. WH— I— YOU. YOU AGAIN.",
    "I CAME. OUT. OF. RETIREMENT. FOR THIS, KID.",
    "I WAS NOT RETIRED. THAT IS A LIE. I WAS ON HOLIDAY. THE POINT STANDS.",
    "FOUR. TIMES. FOUR.",
    "THE PLANE?? THERE IS NO PLANE NOW. THERE IS ONLY VAPOUR. AND CRIES.",
    "MY HARDHAT IS BENT. MY PICKAXE IS BENT. MY MORALE IS BENT, BUB.",
    "I AM STARTIN' TO SUSPECT YOU ARE DOIN' THIS ON PURPOSE.",
    "WHICH IS WORSE THAN AN ACCIDENT. SIGNIFICANTLY WORSE.",
  ],
  // === Level 5 — total breakdown ===
  [
    "RGGGGGHHHH——",
    "FIVE. FIVE. FIIIIIIIVE TIMES, KID.",
    "I LIVE IN A HOLE IN THE GROUND. A HOLE. THAT IS MY HOME.",
    "I ASKED FOR ONE THING. ONE. THING. 'DON'T BLOW UP THE WEBSITE'.",
    "AT THIS POINT I AM JUST RECITING THE DAMAGES INTO THE VOID.",
    "CHLOE HAS NOW BEEN OBLITERATED FIVE SEPARATE TIMES IN ALTERNATE TIMELINES. I HOPE YOU SLEEP WELL.",
    "I AM NOT EVEN ANGRY ANYMORE, BUB. I AM TIRED. I AM SO. TIRED.",
    "…",
    "TYPE THE WORD ONE MORE TIME. SEE WHAT HAPPENS. I DARE YA.",
  ],
];

// Type-speed multiplier per level (1.0 = base; lower = faster)
const TYPE_SPEED_MULTIPLIER = [1.0, 0.95, 0.85, 0.7, 0.5];

export function recordBomb() {
  let n = 0;
  try {
    n = parseInt(localStorage.getItem(COUNT_KEY) || '0', 10) || 0;
    n += 1;
    localStorage.setItem(COUNT_KEY, String(n));
    localStorage.setItem(OWED_KEY, '1');
  } catch {}
  return n;
}

export function isOwed() {
  try { return localStorage.getItem(OWED_KEY) === '1'; } catch { return false; }
}

function getCount() {
  try { return parseInt(localStorage.getItem(COUNT_KEY) || '0', 10) || 0; } catch { return 0; }
}

function clearOwed() {
  try { localStorage.removeItem(OWED_KEY); } catch {}
}

export function showScold() {
  return new Promise((resolve) => {
    const count = getCount();
    const level = Math.min(Math.max(count, 1), 5); // 1..5
    if (count < 1) { clearOwed(); resolve(); return; }

    const overlay = document.getElementById('resetti-overlay');
    const rantEl  = document.getElementById('resetti-rant');
    const btn     = document.getElementById('resetti-dismiss');
    if (!overlay || !rantEl || !btn) {
      clearOwed();
      resolve();
      return;
    }

    overlay.dataset.level = String(level);
    overlay.classList.add('is-open');
    rantEl.replaceChildren();
    btn.disabled = true;
    btn.classList.add('is-waiting');

    const rant = RANTS[level - 1];
    const speedMul = TYPE_SPEED_MULTIPLIER[level - 1];
    const charMs = Math.max(20, Math.round(75 * speedMul));

    let i = 0;
    const next = () => {
      if (i >= rant.length) {
        btn.disabled = false;
        btn.classList.remove('is-waiting');
        return;
      }
      const p = document.createElement('p');
      p.className = 'resetti-line';
      rantEl.appendChild(p);
      // Lower pitch for higher chaos (Resetti's voice cracking under stress).
      const pitch = Math.max(0.55, 0.75 - (level - 1) * 0.04);
      typeAnimalese(p, rant[i], { pitch, speed: charMs });
      const ms = rant[i].length * charMs + 280;
      i += 1;
      setTimeout(next, ms);
    };
    next();

    const onDismiss = () => {
      btn.removeEventListener('click', onDismiss);
      overlay.classList.remove('is-open');
      clearOwed();
      resolve();
    };
    btn.addEventListener('click', onDismiss);
  });
}
