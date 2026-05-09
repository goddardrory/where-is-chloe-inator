// Money Trees — family-shared, server-tracked, persistent across devices.
//
// Lifecycle:
//   1. Buy 'tree-sapling' from the shop. Multiple stack in inventory.
//   2. Click the 🌱 sticker → enters PLANT MODE (custom cursor, soft tint).
//   3. Click anywhere on the page → POSTs to /tree-plant with viewport-relative
//      xPct/yPct. Server consumes one sapling, appends a tree row.
//   4. Tree grows over time:
//        sapling   (0   ≤ t < 15min)
//        growing   (15min ≤ t < 60min)
//        mature    (60min ≤ t)
//      After harvest: regrows to mature 60min after lastHarvested.
//   5. Clicking a mature tree harvests 800–1500 family miles.
//
// Trees render as fixed-position DOM nodes with z-index 200 — above the hero
// card, below modals (350+) and cinematics (500+).

import { showToast } from './toast.js';

const PLANT_URL   = '/.netlify/functions/tree-plant';
const HARVEST_URL = '/.netlify/functions/tree-harvest';
const ROOT_ID     = 'tree-canopy';
const NAME_KEY    = 'whereischloe.familyName';

const SAPLING_MS = 15 * 60 * 1000;   // 15 min
const GROW_MS    = 60 * 60 * 1000;   // 1h to first mature
const REGROW_MS  = 60 * 60 * 1000;   // 1h between harvests

let trees = [];
let plantMode = false;
let plantClickGuard = false;
let renderTimer = null;

export function initTrees() {
  ensureCanopy();
  document.addEventListener('server-state', (e) => {
    const next = e.detail && e.detail.trees;
    if (Array.isArray(next)) {
      trees = next;
      render();
    }
  });
  // Re-render every minute so stages tick forward without a network round-trip.
  if (renderTimer) clearInterval(renderTimer);
  renderTimer = setInterval(render, 60_000);

  // ESC cancels plant mode at any time.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && plantMode) cancelPlantMode();
  });
}

// Called by shop-interactivity routing when the 🌱 sticker is clicked.
export function startPlantMode() {
  if (plantMode) return;
  plantMode = true;
  plantClickGuard = true;
  document.body.classList.add('is-planting');
  showToast('🌱 Click anywhere on the page to plant your sapling. ESC to cancel.', 'info', 4500);

  // Defer click registration past the current click cycle so the sticker click
  // that opened plant mode doesn't immediately count as the plant point.
  setTimeout(() => {
    plantClickGuard = false;
    document.addEventListener('click', onPlantClick, { capture: true });
  }, 250);
}

function cancelPlantMode() {
  plantMode = false;
  document.body.classList.remove('is-planting');
  document.removeEventListener('click', onPlantClick, { capture: true });
  showToast('Plant mode cancelled.', 'info', 1800);
}

async function onPlantClick(event) {
  if (plantClickGuard) return;

  // Don't plant if the click landed inside a modal/overlay or interactive
  // chrome — those clicks are doing their normal thing.
  const targetEl = event.target instanceof Element ? event.target : null;
  if (targetEl && targetEl.closest(
    '.shop-overlay, .settings-overlay, .loan-overlay, .loan-reveal-overlay, .slots-overlay, ' +
    '.shop-button, .settings-button, .casino-button, .doof-button-fab, ' +
    '.shop-sticker, #toast-container, .doof-cinematic, .shield-save, ' +
    '.coin-shower, .immunity-shield, .tristate-banner, .shop-pretzel-banner, ' +
    '.tree-canopy, .tree-element'
  )) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const xPct = (event.clientX / window.innerWidth) * 100;
  const yPct = (event.clientY / window.innerHeight) * 100;

  // Snap out of plant mode immediately so we don't double-fire.
  document.removeEventListener('click', onPlantClick, { capture: true });
  document.body.classList.remove('is-planting');
  plantMode = false;

  let res, data;
  try {
    res = await fetch(PLANT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xPct, yPct, plantedBy: getFamilyName() }),
    });
    data = await res.json();
  } catch {
    showToast('🚫 Network hiccup. Sapling not planted.', 'error');
    return;
  }
  if (!res.ok) {
    showToast(`🚫 ${(data && data.error) || 'Plant failed'}`, 'error');
    return;
  }

  // Mirror state.
  if (Array.isArray(data.trees)) trees = data.trees;
  if (Array.isArray(data.inventory)) {
    document.dispatchEvent(new CustomEvent('inventory-change', {
      detail: { inventory: data.inventory },
    }));
  }
  render();
  showToast('🌱 Sapling planted! Check back in 1 hour.', 'success', 3500);
}

function getFamilyName() {
  try { return localStorage.getItem(NAME_KEY) || null; } catch { return null; }
}

function ensureCanopy() {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;
  root = document.createElement('div');
  root.id = ROOT_ID;
  root.className = 'tree-canopy';
  root.setAttribute('aria-hidden', 'true');
  document.body.appendChild(root);
  return root;
}

function render() {
  const root = ensureCanopy();
  root.replaceChildren();
  const now = Date.now();

  for (const tree of trees) {
    const stage = computeStage(tree, now);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `tree-element tree-stage-${stage}`;
    el.style.left = `${tree.xPct}%`;
    el.style.top  = `${tree.yPct}%`;
    el.dataset.treeId = tree.id;
    el.title = stageTooltip(tree, stage, now);
    el.setAttribute('aria-label', el.title);

    if (stage === 'mature') {
      el.classList.add('is-ripe');
      el.addEventListener('click', () => harvest(tree.id));
    } else {
      el.disabled = true;
    }

    // Image fallbacks: try img first, fall back to emoji on error. The
    // mature sprite has bags drawn in; if we fall back to the 🌳 emoji we
    // overlay 💰 emoji bags so the harvest-ready state still reads.
    const img = document.createElement('img');
    img.className = 'tree-img';
    img.src = `assets/img/tree-${stage}.png`;
    img.alt = '';
    img.addEventListener('error', () => {
      img.replaceWith(emojiFor(stage));
      if (stage === 'mature') {
        const bags = document.createElement('div');
        bags.className = 'tree-bags';
        bags.textContent = '💰💰💰';
        el.appendChild(bags);
      }
    }, { once: true });
    el.appendChild(img);

    root.appendChild(el);
  }
}

function emojiFor(stage) {
  const span = document.createElement('span');
  span.className = 'tree-emoji';
  span.textContent = stage === 'sapling' ? '🌱' : stage === 'growing' ? '🌿' : '🌳';
  return span;
}

function computeStage(tree, now) {
  const planted = Date.parse(tree.plantedAt);
  if (!Number.isFinite(planted)) return 'sapling';
  const sincePlant = now - planted;

  // First-life path (never harvested).
  if (!tree.lastHarvested) {
    if (sincePlant < SAPLING_MS) return 'sapling';
    if (sincePlant < GROW_MS)    return 'growing';
    return 'mature';
  }

  // Post-harvest regrow path: shows 'growing' until REGROW_MS has passed.
  const sinceHarvest = now - Date.parse(tree.lastHarvested);
  if (Number.isFinite(sinceHarvest) && sinceHarvest < REGROW_MS) return 'growing';
  return 'mature';
}

function stageTooltip(tree, stage, now) {
  if (stage === 'mature') return 'Click to harvest 🪙';
  let remainingMs;
  if (!tree.lastHarvested) {
    remainingMs = GROW_MS - (now - Date.parse(tree.plantedAt));
  } else {
    remainingMs = REGROW_MS - (now - Date.parse(tree.lastHarvested));
  }
  const min = Math.max(0, Math.ceil(remainingMs / 60_000));
  return `Ready in ~${min} min`;
}

async function harvest(id) {
  let res, data;
  try {
    res = await fetch(HARVEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    data = await res.json();
  } catch {
    showToast('🚫 Harvest network hiccup.', 'error');
    return;
  }
  if (!res.ok) {
    showToast(`🚫 ${(data && data.error) || 'Harvest failed'}`, 'error');
    return;
  }

  if (Array.isArray(data.trees)) trees = data.trees;
  if (Number.isFinite(data.miles)) {
    try { localStorage.setItem('whereischloe.bonusMiles', String(data.miles)); } catch {}
    document.dispatchEvent(new CustomEvent('miles-change', {
      detail: { delta: data.harvested ? data.harvested.payout : 0, reason: 'tree-harvest', total: data.miles },
    }));
  }

  // Coin-fly animation from the harvested tree to the miles chip.
  const harvestedEl = document.querySelector(`.tree-element[data-tree-id="${cssEscape(id)}"]`);
  if (harvestedEl && data.harvested) {
    flyCoins(harvestedEl, data.harvested.payout);
  }
  render();
  if (data.harvested) {
    showToast(`🪙 +${data.harvested.payout} miles harvested!`, 'success', 3500);
  }
}

function cssEscape(s) {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function flyCoins(fromEl, payout) {
  const fromRect = fromEl.getBoundingClientRect();
  const target = document.getElementById('miles-count') || document.querySelector('.miles-chip');
  const tRect = target ? target.getBoundingClientRect() : { left: window.innerWidth - 80, top: 24, width: 40, height: 40 };
  const tx = tRect.left + tRect.width / 2;
  const ty = tRect.top  + tRect.height / 2;

  const COUNT = 5;
  for (let i = 0; i < COUNT; i++) {
    const c = document.createElement('div');
    c.className = 'tree-fly-coin';
    c.textContent = '🪙';
    const sx = fromRect.left + fromRect.width / 2 + (Math.random() - 0.5) * 20;
    const sy = fromRect.top  + fromRect.height / 2 + (Math.random() - 0.5) * 20;
    c.style.left = sx + 'px';
    c.style.top  = sy + 'px';
    c.style.setProperty('--target-x', `${tx - sx}px`);
    c.style.setProperty('--target-y', `${ty - sy}px`);
    c.style.animationDelay = (i * 80) + 'ms';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1300 + i * 80);
  }
}
