import { showToast } from './toast.js';
import { formatRelative } from './countdown.js';
import { addMiles, awardAchievement } from './nook-miles.js';

const FEED_URL = '/.netlify/functions/get-messages';
const REFRESH_MS = 60_000;

export function initMessages() {
  const form = document.getElementById('message-form');
  const counter = document.getElementById('char-counter');
  const textarea = document.getElementById('message-text');
  const nameField = document.getElementById('message-name');

  // Pre-fill name from the splash entry. User can still edit it per submit.
  if (nameField && !nameField.value) {
    try {
      const saved = localStorage.getItem('whereischloe.userName');
      if (saved) nameField.value = saved;
    } catch {}
  }

  if (textarea && counter) {
    const update = () => { counter.textContent = `${textarea.value.length} / 280`; };
    textarea.addEventListener('input', update);
    update();
  }

  if (form) {
    form.addEventListener('submit', onSubmit);
  }

  refreshFeed();
  setInterval(refreshFeed, REFRESH_MS);
}

async function onSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const submitBtn = form.querySelector('button[type=submit]');

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const params = new URLSearchParams();
  for (const [k, v] of data) params.append(k, String(v));

  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showToast('Hooo! Message delivered, yes yes 🍃', 'success');
    addMiles(75, 'message posted');
    awardAchievement('first-message', 'First message posted!', 250);
    form.reset();
    const counter = document.getElementById('char-counter');
    if (counter) counter.textContent = '0 / 280';
    setTimeout(refreshFeed, 1500);
  } catch (err) {
    showToast('Hm-hmm, something went wrong. Try again?', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function refreshFeed() {
  const feed = document.getElementById('messages-feed');
  if (!feed) return;
  try {
    const res = await fetch(FEED_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) return; // silently fail — keeps the page usable in local/dev too
    const data = await res.json();
    renderFeed(feed, data.messages || []);
  } catch {
    /* offline or server function not configured — keep current feed */
  }
}

function renderFeed(feed, messages) {
  feed.replaceChildren();

  if (!messages.length) {
    const empty = document.createElement('div');
    empty.className = 'messages-empty';
    empty.textContent = 'No messages yet, hooo. Be the first!';
    feed.appendChild(empty);
    return;
  }

  for (const m of messages) {
    const card = document.createElement('article');
    card.className = 'message-card';

    const name = document.createElement('div');
    name.className = 'message-name';
    name.textContent = m.name; // .textContent is XSS-safe

    const text = document.createElement('div');
    text.className = 'message-text';
    text.textContent = m.text;

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatRelative(m.createdAt);

    card.appendChild(name);
    card.appendChild(text);
    card.appendChild(time);
    feed.appendChild(card);
  }
}
