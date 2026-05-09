// Nook's Cranny — family shop client.
//
// GET /.netlify/functions/shop returns the shared catalog + the family's
// inventory + the running miles total. POST { itemId } debits the price
// from the family wallet and appends the item to inventory.
//
// Owned items render as a small sticker row beneath the hero band — every
// device sees the same collection.

import { showToast } from './toast.js';
import { isEnabled } from './unlocks.js';
import { handleStickerClick, playPurchaseSound } from './shop-interactivity.js';
import { openLoanFlow } from './loan.js';
import { openCasino } from './slots.js';

const SHOP_URL = '/.netlify/functions/shop';
const REFRESH_MS = 60_000;

// Local fallback catalog (mirrors the server-side CATALOG in shop.js function).
// Lets the modal render even before the first server response — and for local
// preview when no Netlify Function backend is available. The server is
// authoritative for prices when actually buying.
const FALLBACK_CATALOG = {
  'pretzel-banner':  { name: 'Pretzel Day Banner',     emoji: '🥨', price: 150,  blurb: 'A reminder that Pretzel Day is the best day of the year.' },
  'beet-sticker':    { name: 'Schrute Beet Sticker',   emoji: '🌽', price: 200,  blurb: "Mose's idea. Identity-theft-deterrent." },
  'fedora':          { name: "Perry's Spare Fedora",   emoji: '🎩', price: 300,  blurb: 'Mysteriously appeared. Major Monogram approved.' },
  'boss-mug':        { name: "World's Best Boss Mug",  emoji: '🏆', price: 350,  blurb: 'Self-awarded. Quite emphatic about it.' },
  'schrute-bucks':   { name: 'Schrute Bucks',          emoji: '🪙', price: 400,  blurb: 'Worth roughly 1/100th of a regular Bell, hooo.' },
  'kk-vinyl':        { name: 'KK Slider Vinyl',        emoji: '🎸', price: 600,  blurb: 'A signed mixtape. Catch a smooth ride.' },
  'goose-hat':       { name: 'Goose Sun Hat',          emoji: '🧢', price: 500,  blurb: 'For the rogue goose. Looks insufferably good.' },
  'doof-lab-pass':   { name: 'Doof Evil Inc Lab Pass', emoji: '🧪', price: 800,  blurb: 'Backstage access. Not affiliated with Tri-State Area sovereignty.' },
  'nook-certificate':{ name: "Tom Nook Loan Certificate", emoji: '📜', price: 1000, blurb: 'Hooo! Pre-approved. 19.99% APR after promotional period, yes yes.' },
  'dodo-pin':        { name: 'Dodo Airlines Pin',      emoji: '🛬', price: 1200, blurb: "Dood. Souvenir from Wilbur and Orville's frequent-flyer program." },
  'doof-button':     { name: 'Self-Destruct-inator',   emoji: '🟥', price: 750,  blurb: 'A big shiny red button. PROBABLY does what you think. Curse you, Perry the Platypus!' },
  'casino-pass':     { name: "Tom Nook's Cabaret Pass", emoji: '🎰', price: 600,  blurb: 'Hooo, the spinning, the spinning! Unlocks the family slot machine. House edge generous. Yes yes.' },
  'tree-sapling':    { name: 'Money Tree Sapling',     emoji: '🌱', price: 500,  blurb: 'Plant anywhere. Grows in 1 hour. Bears Bell-bags every 1 hour after that. Stackable, hooo!' },
  'disco-ball':      { name: 'Disco Ball',              emoji: '🪩', price: 700,  blurb: 'Click to dim the lights and let Harry take over. Hooo, the rhythm, yes yes!' },
};

let catalog = { ...FALLBACK_CATALOG };
let inventory = [];
// Server-authoritative family wallet snapshot. The hero miles chip combines
// this WITH flight-derived base miles, but shop purchases only debit the
// family wallet — so we MUST check this value, not the chip total. Updated
// from /shop GET responses + miles-change events.
let serverMiles = 0;

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

  // Allow other modules (e.g. self-destruct) to request a refresh after
  // mutating shared state.
  document.addEventListener('shop-refresh-requested', () => refreshShop());

  refreshShop();
  setInterval(refreshShop, REFRESH_MS);
}

async function refreshShop() {
  try {
    const res = await fetch(SHOP_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const data = await res.json();
    if (data.catalog) {
      catalog = data.catalog;
      document.dispatchEvent(new CustomEvent('shop-catalog', {
        detail: { catalog },
      }));
    }
    if (data.inventory) {
      inventory = data.inventory;
      document.dispatchEvent(new CustomEvent('inventory-change', {
        detail: { inventory },
      }));
    }
    if (Number.isFinite(data.miles)) serverMiles = data.miles;
    renderStickerRow();
    if (isOpen()) renderShopGrid();
  } catch { /* offline */ }
}

// Other modules (slots, tree-harvest, self-destruct) update the family wallet
// server-side — listen for miles-change events to keep our local snapshot
// fresh between the 60s polls.
document.addEventListener('miles-change', (e) => {
  const total = e.detail && e.detail.total;
  if (Number.isFinite(total)) {
    serverMiles = total;
    if (isOpen()) renderShopGrid();
  }
});

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

// Return the family wallet balance (the value purchases actually debit from).
// MUST NOT use the hero miles chip — that adds flight-derived base miles which
// purchases CANNOT spend, leading to false-positive enabled buy buttons.
function getFamilyWallet() {
  return Number.isFinite(serverMiles) ? serverMiles : 0;
}

// Effective price after the personal Schrute Bucks Membership discount + the
// family-wide one-shot 24h discount. Server enforces these too — this just
// keeps the displayed price + disabled-button check honest with what the
// server will actually charge.
function effectivePriceFor(item) {
  let price = item.price;
  if (isEnabled('schrute-bucks')) price = Math.round(item.price * 0.9);
  // Family-wide 24h half-off honours the lower of the two.
  // Note: client doesn't know `discountUntil` from /shop response, but the
  // server response from a successful purchase reflects the actual charge.
  return price;
}

function renderShopGrid() {
  const grid = document.getElementById('shop-items');
  const balanceEl = document.getElementById('shop-balance');
  if (!grid) return;
  grid.replaceChildren();

  const balance = getFamilyWallet();
  if (balanceEl) balanceEl.textContent = `★ ${balance.toLocaleString()} miles`;

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

    const effective = effectivePriceFor(item);
    const price = document.createElement('div');
    price.className = 'shop-item-price';
    if (effective < item.price) {
      const orig = document.createElement('span');
      orig.className = 'shop-item-price-orig';
      orig.textContent = `★ ${item.price.toLocaleString()}`;
      const disc = document.createElement('span');
      disc.className = 'shop-item-price-disc';
      disc.textContent = `★ ${effective.toLocaleString()}`;
      price.appendChild(orig);
      price.appendChild(disc);
    } else {
      price.textContent = `★ ${item.price.toLocaleString()}`;
    }
    card.appendChild(price);

    const buy = document.createElement('button');
    buy.type = 'button';
    buy.className = 'shop-item-buy';
    buy.textContent = 'Buy';
    if (balance < effective) {
      buy.disabled = true;
      buy.textContent = `Need ★ ${(effective - balance).toLocaleString()} more`;
    }
    buy.addEventListener('click', () => buyItem(id, item));
    card.appendChild(buy);

    grid.appendChild(card);
  }
}

async function buyItem(itemId, item) {
  try {
    const body = { itemId };
    if (isEnabled('schrute-bucks')) body.discountPct = 10;
    const res = await fetch(SHOP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = 'Purchase failed';
      try { const err = await res.json(); msg = err.error || msg; } catch {}
      showToast(`🚫 ${msg}`, 'error');
      return;
    }
    const data = await res.json();
    if (data.inventory) {
      inventory = data.inventory;
      document.dispatchEvent(new CustomEvent('inventory-change', {
        detail: { inventory },
      }));
    }
    if (Number.isFinite(data.miles)) {
      // Tell main.js the shared total has changed so the chip updates.
      try { localStorage.setItem('whereischloe.bonusMiles', String(data.miles)); } catch {}
      document.dispatchEvent(new CustomEvent('miles-change', {
        detail: { delta: -item.price, reason: `shop:${itemId}`, total: data.miles },
      }));
    }
    playPurchaseSound(itemId);
    showToast(`✨ Acquired ${item.name}!`, 'success', 4500);
    renderStickerRow();
    if (isOpen()) renderShopGrid();
  } catch (err) {
    showToast('🚫 Network hiccup. Try again?', 'error');
  }
}

// Sticker IDs that are NOT shown in the row (handled elsewhere in the UI).
const STICKER_HIDDEN = new Set(['doof-button']);

function renderStickerRow() {
  const row = document.getElementById('shop-stickers');
  if (!row) return;
  row.replaceChildren();

  // Dedupe by item id with a count — multiple copies show as one sticker
  // with a small ×N badge.
  const counts = new Map();
  for (const owned of inventory) {
    if (!owned || STICKER_HIDDEN.has(owned.id)) continue;
    counts.set(owned.id, (counts.get(owned.id) || 0) + 1);
  }

  let i = 0;
  for (const [id, count] of counts.entries()) {
    const item = catalog[id];
    if (!item) continue;
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'shop-sticker';
    s.dataset.itemId = id;
    s.title = `${item.name} — click to use`;
    // Stagger the wiggle so all stickers don't sync.
    s.style.animationDelay = `${(i % 6) * 1.7}s`;
    i++;

    const emoji = document.createElement('span');
    emoji.className = 'shop-sticker-emoji';
    emoji.textContent = item.emoji;
    s.appendChild(emoji);

    if (count > 1) {
      const badge = document.createElement('span');
      badge.className = 'shop-sticker-count';
      badge.textContent = `×${count}`;
      s.appendChild(badge);
    }

    s.addEventListener('click', () => onStickerClick(id));
    row.appendChild(s);
  }
}

function onStickerClick(itemId) {
  if (itemId === 'nook-certificate') {
    openLoanFlow(catalog, inventory);
    return;
  }
  if (itemId === 'casino-pass') {
    openCasino();
    return;
  }
  handleStickerClick(itemId);
}

// Called when the family wipes miles (bombing). Refresh inventory + UI;
// inventory itself isn't wiped server-side, just miles.
export function refreshAfterWipe() {
  refreshShop();
}
