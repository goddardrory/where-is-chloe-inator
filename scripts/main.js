import { FLIGHTS } from '../data/flights.js';
import { computeState, computeJourneyProgress, computeMilesEarned } from './flight-state.js';
import { narrate, randomNookQuote } from './nook-narrator.js';
import { typeAnimalese, cancelAnimalese, preloadAcedio, whenAcedioReady } from './animalese.js';
import { start as startBgMusic, crossFadeTo as bgCrossFade, mute as muteBg, unmute as unmuteBg } from './bg-music.js';
import { isOwed as isResettiOwed, showScold as showResettiScold } from './resetti-scold.js';
import { formatCountdown } from './countdown.js';
import { initEasterEggs, spawnConfetti, whenInitialDoofClosed, spawnFlyBy } from './easter-eggs.js';
import { initMessages } from './messages.js';
import { initTrivia } from './trivia.js';
import { showToast } from './toast.js';
import { playPerry, playPerryTheme } from './audio.js';

const TICK_MS = 1000; // 1s tick keeps countdown smooth; cheap.
const NARRATOR_SWITCH_MS = 9000; // alternate bubble between state & quote

let lastPhase = null;
let lastFlightIdx = null;
let narratorMode = 'state'; // 'state' or 'quote'
let currentQuote = '';
let lastStateKey = null;     // re-animalese only when this changes
let bubbleReady = false;     // gated until Acedio + Doof overlay are done

const VISITED_KEY = 'whereischloe.visited';

async function init() {
  // Kick off Acedio's WAV preload immediately so it's ready by the time the
  // first Tom Nook line is due to type out.
  preloadAcedio();

  // If they detonated the site on a previous visit, Resetti has a word for
  // them before anything else loads.
  let gestureRecorded = false;
  if (isResettiOwed()) {
    await showResettiScold();
    gestureRecorded = true; // dismissing Resetti is itself a gesture
  }

  // First-visit splash: a single click to unlock audio so the Doof overlay's
  // jingle + bg-music can fire on this visit. Subsequent visits skip it.
  const visited = (() => { try { return localStorage.getItem(VISITED_KEY) === '1'; } catch { return false; } })();
  if (!visited && !gestureRecorded) {
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
      currentQuote = randomNookQuote();
      const bubble = document.getElementById('nook-bubble');
      if (bubble) typeAnimalese(bubble, currentQuote);
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

  setText('miles-count', miles);

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
      break;
    case 'layover':
      showToast(`🥨 Pretzel Day! On layover at ${newState.atAirport}`, '', 5000);
      bgCrossFade('ground');
      break;
    case 'arrived':
      showToast(`🎉 Welcome to Durban, ${newState.finalFlight.arr.city}!`, 'success', 8000);
      spawnConfetti(60);
      playPerryTheme();
      bgCrossFade('ground');
      break;
  }
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

// === First-visit splash ===
//
// Shows a small "Click anywhere to begin" screen. Resolves on the first user
// gesture so audio is unlocked before the Doof overlay opens its jingle.
function showSplash() {
  return new Promise((resolve) => {
    const splash = document.getElementById('splash-overlay');
    if (!splash) { resolve(); return; }
    splash.classList.add('is-open');

    const onGesture = () => {
      splash.removeEventListener('click', onGesture);
      document.removeEventListener('keydown', onGesture);
      splash.classList.remove('is-open');
      resolve();
    };
    splash.addEventListener('click', onGesture);
    document.addEventListener('keydown', onGesture);
  });
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
