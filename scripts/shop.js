// Nook's Cranny — family shop client.
//
// GET /.netlify/functions/shop returns the shared catalog + the family's
// inventory + the running miles total. POST { itemId } debits the price
// from the family wallet and appends the item to inventory.
//
// Owned items render as a small sticker row beneath the hero band — every
// device sees the same collection.

import { showToast } from './toast.js';

const SHOP_URL = '/.netlify/functions/shop';
const REFRESH_MS = 60_000;

let catalog = {};
let inventory = [];

export function initShop() {
  const btn = document.getElementById('shop-button');
  if (btn) btn.addEventListener('click', openShop);

  const closeBtn = document.getElementById('shop-close');
  if (closeBtn) closeBtn.addEventListener('click', closeShop);

  const overlay = document.getElementById('shop-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeShop();
    });
  }

  refreshShop();
  setInterval(refreshShop, REFRESH_MS);
}

async function refreshShop() {
  try {
    const res = await fetch(SHOP_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const data = await res.json();
    if (data.catalog)   catalog   = data.catalog;
    if (data.inventory) inventory = data.inventory;
    renderStickerRow();
    if (isOpen()) renderShopGrid();
  } catch { /* offline */ }
}

function isOpen() {
  const overlay = document.getElementById('shop-overlay');
  return !!overlay && overlay.classList.contains('is-open');
}

async function openShop() {
  await refreshShop();
  const overlay = document.getElementById('shop-overlay');
  if (!overlay) return;
  overlay.classList.add('is-open');
  renderShopGrid();
}

function closeShop() {
  const overlay = document.getElementById('shop-overlay');
  if (overlay) overlay.classList.remove('is-open');
}

function getMilesElement() {
  // Read miles directly from the live chip — keeps us in sync with the
  // total displayed (which is shared bonus + flight base).
  const chip = document.getElementById('miles-count');
  if (!chip) return 0;
  const n = parseInt(chip.textContent, 10);
  return Number.isFinite(n) ? n : 0;
}

function renderShopGrid() {
  const grid = document.getElementById('shop-items');
  const balanceEl = document.getElementById('shop-balance');
  if (!grid) return;
  grid.replaceChildren();

  const balance = getMilesElement();
  if (balanceEl) balanceEl.textContent = `★ ${balance} miles`;

  const ownedCounts = {};
  for (const owned of inventory) {
    ownedCounts[owned.id] = (ownedCounts[owned.id] || 0) + 1;
  }

  for (const [id, item] of Object.entries(catalog)) {
    const card = document.createElement('div');
    card.className = 'shop-item';

    const emoji = document.createElement('div');
    emoji.className = 'shop-item-emoji';
    emoji.textContent = item.emoji;
    card.appendChild(emoji);

    const name = document.createElement('div');
    name.className = 'shop-item-name';
    name.textContent = item.name;
    card.appendChild(name);

    const blurb = document.createElement('div');
    blurb.className = 'shop-item-blurb';
    blurb.textContent = item.blurb || '';
    card.appendChild(blurb);

    const owned = ownedCounts[id] || 0;
    if (owned > 0) {
      const ownedTag = document.createElement('div');
      ownedTag.className = 'shop-item-owned';
      ownedTag.textContent = owned === 1 ? 'Owned' : `Owned ×${owned}`;
      card.appendChild(ownedTag);
    }

    const price = document.createElement('div');
    price.className = 'shop-item-price';
    price.textContent = `★ ${item.price}`;
    card.appendChild(price);

    const buy = document.createElement('button');
    buy.type = 'button';
    buy.className = 'shop-item-buy';
    buy.textContent = 'Buy';
    if (balance < item.price) {
      buy.disabled = true;
      buy.textContent = 'Not enough miles';
    }
    buy.addEventListener('click', () => buyItem(id, item));
    card.appendChild(buy);

    grid.appendChild(card);
  }
}

async function buyItem(itemId, item) {
  try {
    const res = await fetch(SHOP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    if (!res.ok) {
      let msg = 'Purchase failed';
      try { const err = await res.json(); msg = err.error || msg; } catch {}
      showToast(`🚫 ${msg}`, 'error');
      return;
    }
    const data = await res.json();
    if (data.inventory) inventory = data.inventory;
    if (Number.isFinite(data.miles)) {
      // Tell main.js the shared total has changed so the chip updates.
      try { localStorage.setItem('whereischloe.bonusMiles', String(data.miles)); } catch {}
      document.dispatchEvent(new CustomEvent('miles-change', {
        detail: { delta: -item.price, reason: `shop:${itemId}`, total: data.miles },
      }));
    }
    showToast(`✨ Acquired ${item.name}!`, 'success', 4500);
    renderStickerRow();
    if (isOpen()) renderShopGrid();
  } catch (err) {
    showToast('🚫 Network hiccup. Try again?', 'error');
  }
}

function renderStickerRow() {
  const row = document.getElementById('shop-stickers');
  if (!row) return;
  row.replaceChildren();
  for (const owned of inventory) {
    const item = catalog[owned.id];
    if (!item) continue;
    const s = document.createElement('div');
    s.className = 'shop-sticker';
    s.title = item.name;
    s.textContent = item.emoji;
    row.appendChild(s);
  }
}

// Called when the family wipes miles (bombing). Refresh inventory + UI;
// inventory itself isn't wiped server-side, just miles.
export function refreshAfterWipe() {
  refreshShop();
}
