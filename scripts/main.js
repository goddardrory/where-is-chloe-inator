import { FLIGHTS } from '../data/flights.js';
import { computeState, computeJourneyProgress, computeMilesEarned } from './flight-state.js';
import { narrate, randomNookQuote, randomNookTwssBait } from './nook-narrator.js';
import { typeAnimalese, cancelAnimalese, preloadAcedio, whenAcedioReady } from './animalese.js';
import { start as startBgMusic, crossFadeTo as bgCrossFade, mute as muteBg, unmute as unmuteBg } from './bg-music.js';
import { isOwed as isResettiOwed, showScold as showResettiScold } from './resetti-scold.js';
import { getBonusMiles, addMiles, awardAchievement } from './nook-miles.js';
import { formatCountdown } from './countdown.js';
import { initEasterEggs, spawnConfetti, whenInitialDoofClosed, spawnFlyBy } from './easter-eggs.js';
import { initMessages } from './messages.js';
import { initTrivia } from './trivia.js';
import { showToast } from './toast.js';
import { playPerry, playPerryTheme, playTwss } from './audio.js';

const TICK_MS = 1000; // 1s tick keeps countdown smooth; cheap.
const NARRATOR_SWITCH_MS = 9000; // alternate bubble between state & quote

let lastPhase = null;
let lastFlightIdx = null;
let narratorMode = 'state'; // 'state' or 'quote'
let currentQuote = '';
let lastStateKey = null;     // re-animalese only when this changes
let bubbleReady = false;     // gated until Acedio + Doof overlay are done

const VISITED_KEY = 'whereischloe.visited';
const NAME_KEY    = 'whereischloe.userName';

async function init() {
  // Kick off Acedio's WAV preload immediately so it's ready by the time the
  // first Tom Nook line is due to type out.
  preloadAcedio();

  // Listen for miles + achievement events (fired from nook-miles.js)
  document.addEventListener('miles-change', (e) => {
    const chip = document.getElementById('miles-chip');
    if (!chip) return;
    chip.classList.add('flash');
    // Tone the flash class to indicate gain vs loss
    chip.classList.toggle('flash-loss', (e.detail.delta || 0) < 0);
    setTimeout(() => chip.classList.remove('flash', 'flash-loss'), 700);
  });
  document.addEventListener('achievement', (e) => {
    const { label, miles } = e.detail || {};
    const sign = miles && miles < 0 ? '−' : '+';
    const amount = miles ? `${sign}${Math.abs(miles)} mi` : '';
    showToast(`★ ${label} ${amount}`, miles && miles < 0 ? 'bankruptcy' : 'success', 4500);
  });

  // If they detonated the site on a previous visit, Resetti has a word for
  // them before anything else loads.
  let gestureRecorded = false;
  if (isResettiOwed()) {
    await showResettiScold();
    gestureRecorded = true; // dismissing Resetti is itself a gesture
  }

  // Always show the splash — browser autoplay needs a fresh user gesture on
  // every page load, so the only way to guarantee the Doof jingle + bg-music
  // play in sync with the overlay is to require one click on entry. The
  // splash content adapts: full name prompt for first-time visitors, a
  // brief "Welcome back" continue card for returning ones.
  if (!gestureRecorded) {
    await showSplash();
  }
  try { localStorage.setItem(VISITED_KEY, '1'); } catch {}

  renderFlightCards();
  initEasterEggs();
  initMessages();
  initTrivia();
  initAudioControls();

  // Background music kicks off after init so all the duck/unduck wiring is in
  // place. Pick the initial track based on the current journey phase so a
  // visitor opening the page mid-flight hears the airline track immediately.
  const initialState = computeState(new Date());
  startBgMusic(initialState.phase === 'in-flight' ? 'air' : 'ground');

  tick();
  setInterval(tick, TICK_MS);
  startAirlineAnnouncements();
  initInteractiveMiles();

  // Wait for the Doof overlay to dismiss AND for Acedio to be loaded before
  // we start typing Tom Nook quotes — otherwise the first quote uses the
  // synth fallback and Tom Nook talks behind/over the Doof intro.
  await Promise.all([
    whenInitialDoofClosed(),
    whenAcedioReady(),
  ]);

  bubbleReady = true;
  lastStateKey = null; // force the very next tick to re-animalese cleanly

  // Alternate the Tom Nook bubble between live status and famous quotes.
  // Both modes use Animalese; the next tick handles state mode by re-picking.
  setInterval(() => {
    narratorMode = narratorMode === 'state' ? 'quote' : 'state';
    cancelAnimalese();
    if (narratorMode === 'quote') {
      // 25% of quotes pull from the TWSS-bait pool. When that fires, queue
      // Michael's "That's what she said" right after Animalese finishes.
      const useTwssBait = Math.random() < 0.25;
      currentQuote = useTwssBait ? randomNookTwssBait() : randomNookQuote();
      const bubble = document.getElementById('nook-bubble');
      if (bubble) {
        typeAnimalese(bubble, currentQuote);
        if (useTwssBait) {
          // Animalese types at ~75ms per char; tack on a small beat for
          // Nook to land the line before Michael punches the punchline.
          const animMs = currentQuote.length * 75 + 350;
          setTimeout(() => {
            playTwss();
            showToast('👔 Michael: "That\'s what she said!"', '', 3500);
          }, animMs);
        }
      }
    } else {
      // Force the next tick to re-pick & re-animalese a fresh state line.
      lastStateKey = null;
    }
  }, NARRATOR_SWITCH_MS);
}

// === Tick: re-render based on current state ===
function tick() {
  const now = new Date();
  const state = computeState(now);
  const progress = computeJourneyProgress(now);
  const miles = computeMilesEarned(now);
  const { hero, nookOptions } = narrate(state);

  setText('status-line', hero);

  // State-mode bubble: type a fresh random line via Animalese only when we
  // first enter state mode or the phase changes. Gated on bubbleReady so we
  // don't fire the first quote until the Doof overlay closes + Acedio loads.
  if (narratorMode === 'state' && bubbleReady) {
    const key = `${state.phase}:${state.index ?? ''}`;
    if (key !== lastStateKey) {
      lastStateKey = key;
      const line = nookOptions[Math.floor(Math.random() * nookOptions.length)];
      const bubble = document.getElementById('nook-bubble');
      if (bubble) typeAnimalese(bubble, line);
    }
  }

  // Total miles = flight-derived base + interactive bonus from localStorage
  setText('miles-count', miles + getBonusMiles());

  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = `${(progress * 100).toFixed(2)}%`;
  setText('progress-percent', `${Math.round(progress * 100)}%`);

  updateCardsHighlight(state);
  updateLayover(state);
  updateMap(state);

  // Phase change toasts
  const phase = state.phase;
  const idx = state.index ?? null;
  if (phase !== lastPhase || idx !== lastFlightIdx) {
    if (lastPhase !== null) onPhaseChange(lastPhase, state);
    lastPhase = phase;
    lastFlightIdx = idx;
  }
}

// === Phase-change handlers ===
function onPhaseChange(prevPhase, newState) {
  switch (newState.phase) {
    case 'in-flight':
      showToast(`✈️ Flight ${newState.flight.num} is airborne!`, 'success', 5000);
      bgCrossFade('air');
      awardAchievement(`leg-airborne-${newState.index}`, `Flight ${newState.flight.num} airborne!`, 100);
      break;
    case 'layover':
      showToast(`🥨 Pretzel Day! On layover at ${newState.atAirport}`, '', 5000);
      bgCrossFade('ground');
      awardAchievement(`leg-landed-${newState.fromFlight.num}`, `${newState.fromFlight.num} landed safely!`, 200);
      break;
    case 'arrived':
      showToast(`🎉 Welcome to Durban, ${newState.finalFlight.arr.city}!`, 'success', 8000);
      spawnConfetti(60);
      spawnBellRain(80);
      playPerryTheme();
      bgCrossFade('ground');
      awardAchievement('arrival', 'Safely in Durban!', 1500);
      break;
  }
}

// Cascading rain of bells/coins for celebration moments.
function spawnBellRain(count = 60) {
  const symbols = ['🪙', '💰', '⭐', '🍃', '✨'];
  for (let i = 0; i < count; i++) {
    const bell = document.createElement('div');
    bell.className = 'bell-rain';
    bell.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    bell.style.left = `${Math.random() * 100}vw`;
    bell.style.animationDelay = `${Math.random() * 1.8}s`;
    bell.style.animationDuration = `${3 + Math.random() * 2.2}s`;
    document.body.appendChild(bell);
    setTimeout(() => bell.remove(), 6500);
  }
}

// Tom Nook airline announcements: a soft toast every 12-20 minutes while
// Chloe is airborne. Uses the existing toast infrastructure.
function startAirlineAnnouncements() {
  const fire = () => {
    const state = computeState(new Date());
    if (state.phase === 'in-flight') {
      // 30% chance Nook says a TWSS-bait line — those guarantee Michael
      // chimes in. Otherwise pick a regular announcement; Michael has an
      // 18% chance of following up on those.
      const useTwssBait = Math.random() < 0.30;
      let line;
      if (useTwssBait) {
        line = randomNookTwssBait();
      } else {
        const regular = [
          `Hooo! Currently cruising over ${state.region}, yes yes!`,
          `Tom Nook says: "Cabin pressure stable. Loan repayment also stable, hooo."`,
          `Yes yes, ${Math.round(state.progress * 100)}% across ${state.flight.dep.city}→${state.flight.arr.city}, hm-hmm.`,
          `Above ${state.region}. The Bells are rolling in, yes yes! …to me, mostly.`,
          `Pretzel update: served, probably stale, charged extra. Stanley would weep, hm-hmm.`,
          `Hooo! Captain reports tailwinds AND favourable financing terms. Both rare!`,
          `Yes yes, do enjoy the in-flight catalogue. Page 47 has the loan schedule, hooo.`,
        ];
        line = regular[Math.floor(Math.random() * regular.length)];
      }
      showToast(`🦝 ${line}`, '', 6000);

      const willFollow = useTwssBait || Math.random() < 0.18;
      if (willFollow) {
        setTimeout(() => {
          playTwss();
          showToast('👔 Michael: "That\'s what she said!"', '', 3500);
        }, 1300);
      }
    }
    setTimeout(fire, (12 + Math.random() * 8) * 60_000);
  };
  // First announcement 5-10 min after init so visitors aren't bombarded immediately
  setTimeout(fire, (5 + Math.random() * 5) * 60_000);
}

// === Render flight cards (once on init) ===
function renderFlightCards() {
  const root = document.getElementById('flight-cards');
  if (!root) return;
  root.replaceChildren();

  for (const f of FLIGHTS) {
    const card = document.createElement('article');
    card.className = 'flight-card pending';
    card.dataset.num = f.num;

    const icon = document.createElement('div');
    icon.className = 'flight-icon';
    icon.textContent = '✈️';

    const meta = document.createElement('div');
    meta.className = 'flight-meta';

    const airline = document.createElement('div');
    airline.className = 'flight-airline';
    airline.textContent = f.airline;

    const num = document.createElement('div');
    num.className = 'flight-number';
    num.textContent = f.num;

    const route = document.createElement('div');
    route.className = 'flight-route';
    route.textContent = `${f.dep.city} → ${f.arr.city}`;

    const times = document.createElement('div');
    times.className = 'flight-times';
    times.textContent = `${formatLocal(f.dep.iso)} – ${formatLocal(f.arr.iso)}`;

    meta.append(airline, num, route, times);

    const status = document.createElement('div');
    status.className = 'flight-status';

    const pill = document.createElement('span');
    pill.className = 'status-pill pending';
    pill.textContent = 'Pending';

    const milesEl = document.createElement('span');
    milesEl.className = 'flight-miles';
    milesEl.textContent = `+${f.miles} mi`;

    status.append(pill, milesEl);

    card.append(icon, meta, status);
    root.appendChild(card);
  }
}

function formatLocal(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Render in the airport's local time using the offset embedded in the ISO string.
  // Use the Intl API with the timezone-offset trick: parseISO preserves offset → Date.toLocaleString
  // Here we just show "MMM dd, HH:mm" in the user's locale for readability.
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
}

// === Update which card is active / completed / pending ===
function updateCardsHighlight(state) {
  const cards = document.querySelectorAll('.flight-card');
  cards.forEach((card, i) => {
    const f = FLIGHTS[i];
    const arrived = Date.now() >= new Date(f.arr.iso).getTime();
    const isActive = state.phase === 'in-flight' && state.index === i;

    card.classList.toggle('active', isActive);
    card.classList.toggle('completed', arrived);
    card.classList.toggle('pending', !isActive && !arrived);

    const pill = card.querySelector('.status-pill');
    if (pill) {
      pill.classList.remove('pending', 'active', 'landed');
      if (arrived)        { pill.classList.add('landed');  pill.textContent = 'Landed'; }
      else if (isActive)  { pill.classList.add('active');  pill.textContent = 'In Air'; }
      else                { pill.classList.add('pending'); pill.textContent = 'Pending'; }
    }
  });
}

// === Layover panel ===
function updateLayover(state) {
  const section = document.getElementById('layover-section');
  if (!section) return;

  if (state.phase !== 'layover') {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  setText('layover-airport', state.atAirport);
  setText('layover-timer', formatCountdown(state.msUntilNext));
}

// === Tracker card ===
function updateMap(state) {
  // Pick which flight is the "focus" of the tracker card based on phase.
  let focus = null;
  let percent = 0;
  let detail = '';

  if (state.phase === 'pre-trip') {
    focus = FLIGHTS[0];
    percent = 0;
    detail = 'Awaiting departure';
  } else if (state.phase === 'in-flight') {
    focus = state.flight;
    percent = state.progress * 100;
    detail = `${Math.round(percent)}% complete · over ${state.region}`;
  } else if (state.phase === 'layover') {
    focus = state.toFlight;
    percent = 0;
    detail = `Next flight from ${state.atAirport}`;
  } else if (state.phase === 'arrived') {
    focus = FLIGHTS[FLIGHTS.length - 1];
    percent = 100;
    detail = 'Safely on the ground in Durban 🇿🇦';
  }

  if (!focus) return;

  setText('tracker-from',   focus.dep.code);
  setText('tracker-to',     focus.arr.code);
  setText('tracker-flight', `${focus.num} · ${focus.dep.city} → ${focus.arr.city}`);
  setText('tracker-detail', detail);

  const plane = document.getElementById('tracker-plane');
  if (plane) {
    // The plane sits along the SVG arc. We approximate its Y by reusing the same
    // quadratic curve in CSS — easier: place it linearly across left, and lift
    // it slightly toward the middle to match the visual arc.
    const clamped = Math.max(0, Math.min(100, percent));
    plane.style.left = `${clamped}%`;
    const lift = Math.sin((clamped / 100) * Math.PI) * 22; // up to 22px above center
    plane.style.transform = `translate(-50%, calc(-50% - ${lift}px)) rotate(${(clamped - 50) * 0.3}deg)`;
  }

  const cta = document.getElementById('tracker-cta');
  if (cta) cta.href = focus.flightAwareUrl;
}

// === Audio controls (Perry button + KK toggle) ===
function initAudioControls() {
  const perryBtn = document.getElementById('perry-btn');
  const kkToggle = document.getElementById('kk-toggle');

  if (perryBtn) {
    perryBtn.addEventListener('click', () => {
      playPerry();
      spawnFlyBy('🕵️', 'assets/img/perry-fly.png', { heightPx: 280 });
      addMiles(2, 'summon Perry');
      awardAchievement('perry-summon', 'Perryyyyy summoned!', 40);
    });
  }
  if (kkToggle) {
    // Default: pressed=true (music ON; pressing toggles to mute).
    kkToggle.setAttribute('aria-pressed', 'true');
    kkToggle.addEventListener('click', () => {
      const pressed = kkToggle.getAttribute('aria-pressed') === 'true';
      const newState = !pressed;
      kkToggle.setAttribute('aria-pressed', String(newState));
      if (newState) unmuteBg(); else muteBg();
    });
  }
}

// === Entry splash ===
//
// Shows on every page load to guarantee a user gesture before the Doof
// overlay opens (so the jingle + bg-music play in sync). Adapts its content:
//   - First visit: name prompt + "Begin journey ✨" button.
//   - Returning visit: "Welcome back, <name>!" + "Continue ✨" button.
//
// Submitting (or skipping) is the gesture that unlocks audio.
function showSplash() {
  return new Promise((resolve) => {
    const splash   = document.getElementById('splash-overlay');
    const form     = document.getElementById('splash-form');
    const titleEl  = splash && splash.querySelector('.splash-title');
    const subEl    = splash && splash.querySelector('.splash-sub');
    const input    = document.getElementById('splash-name');
    const submit   = form && form.querySelector('.splash-button');
    const skip     = document.getElementById('splash-skip');
    if (!splash || !form) { resolve(); return; }

    let savedName = '';
    try { savedName = localStorage.getItem(NAME_KEY) || ''; } catch {}

    if (savedName) {
      // Returning-visitor variant
      if (titleEl) titleEl.textContent = `Welcome back, ${savedName}!`;
      if (subEl)   subEl.textContent   = 'Hooo! Click to follow the journey.';
      if (input) {
        input.removeAttribute('required');
        input.style.display = 'none';
        input.value = savedName;
      }
      if (submit) submit.textContent = 'Continue ✨';
      if (skip)   skip.style.display = 'none';
    } else {
      // First-visit variant — restore defaults if the splash element was reused
      if (titleEl) titleEl.textContent = 'Hooo! Welcome, traveler!';
      if (subEl)   subEl.textContent   = 'What shall we call you, hm-hmm?';
      if (input) {
        input.setAttribute('required', '');
        input.style.display = '';
      }
      if (submit) submit.textContent = 'Begin journey ✨';
      if (skip)   skip.style.display = '';
    }

    splash.classList.add('is-open');
    setTimeout(() => {
      try { if (input && !savedName) input.focus(); } catch {}
    }, 250);

    const finish = (name) => {
      try { if (name) localStorage.setItem(NAME_KEY, name); } catch {}
      splash.classList.remove('is-open');
      resolve();
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      finish((input && input.value || '').trim());
    });
    if (skip) skip.addEventListener('click', () => finish(''));
  });
}

// === Interactive miles wiring ===
//
// Hooks click handlers on small interactive elements so family poking around
// the page racks up Nook Miles. First time triggering each gets a toast via
// awardAchievement; repeats just nudge the counter.
function initInteractiveMiles() {
  // Tom Nook avatar — pet him for a small bonus + replay a famous quote.
  // Crucially we DO NOT reset lastStateKey here. If we did, the very next
  // tick (≤1s) would re-pick a state line and overwrite the quote we just
  // typed. By leaving lastStateKey alone, the click's quote stays put until
  // the next natural rotation (state-phase change or narrator-mode flip).
  const nookAvatar = document.querySelector('.nook-avatar');
  if (nookAvatar) {
    nookAvatar.style.cursor = 'pointer';
    nookAvatar.addEventListener('click', () => {
      addMiles(2, 'pet Tom Nook');
      awardAchievement('pet-nook', 'Tom Nook says hi!', 30);
      const bubble = document.getElementById('nook-bubble');
      if (bubble) typeAnimalese(bubble, randomNookQuote());
    });
  }

  // Flight cards — tap to "inspect"
  document.querySelectorAll('.flight-card').forEach((card) => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      addMiles(2, 'inspect flight');
      awardAchievement('inspect-flight', 'Flight inspected!', 25);
      card.style.transition = 'transform 0.18s ease';
      card.style.transform = 'scale(1.02)';
      setTimeout(() => { card.style.transform = ''; }, 200);
    });
  });

  // Hero name (Chloe) — tiny easter pat
  const heroName = document.querySelector('.hero-name');
  if (heroName) {
    heroName.style.cursor = 'pointer';
    heroName.addEventListener('click', () => {
      addMiles(1, 'tap Chloe');
      awardAchievement('tap-chloe', 'Hi Chloe!', 50);
    });
  }
}

// === Tiny helper ===
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

// === Boot ===
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
