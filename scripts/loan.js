// Tom Nook Loan Certificate — economic comedy.
//
// Flow on click:
//   1. "Sign Here" modal with cream parchment vibe + tiny grey fine print.
//   2. After signing, a free-item picker shows the catalog grid (excluding
//      banned items). Family member picks one.
//   3. POST to /.netlify/functions/loan-redeem — atomically grants the free
//      item AND debits 49,800 from the family wallet (allowed to go negative).
//   4. Smug-Nook full-page reveal overlay slams in.
//   5. ~2s later, michael-bankruptcy.mp3 plays for comic effect.
//   6. While wallet < 0, a smug-Nook badge with the negative balance hovers
//      next to the miles chip until natural earnings climb back to zero.

import { showToast } from './toast.js';
import { playMichaelBankruptcy } from './audio.js';

const REDEEM_URL = '/.netlify/functions/loan-redeem';
const LOAN_AMOUNT = 49800;
const BANNED_PICKS = new Set(['doof-button']);

let catalog = {};
let inventory = [];

export function initLoan() {
  document.addEventListener('inventory-change', (e) => {
    if (e.detail && Array.isArray(e.detail.inventory)) {
      inventory = e.detail.inventory;
    }
  });
  document.addEventListener('shop-catalog', (e) => {
    if (e.detail && e.detail.catalog) catalog = e.detail.catalog;
  });
  document.addEventListener('miles-change', (e) => {
    const total = e.detail && e.detail.total;
    if (Number.isFinite(total)) updateDebtBadge(total);
  });
  // Also reactive on full server-state syncs.
  document.addEventListener('server-state', (e) => {
    const total = e.detail && e.detail.total;
    if (Number.isFinite(total)) updateDebtBadge(total);
  });

  ensureSignModal();
  ensurePickModal();
  ensureRevealOverlay();
  ensureDebtBadge();
}

// Called by shop.js when the loan-certificate sticker is clicked.
export function openLoanFlow(currentCatalog, currentInventory) {
  catalog = currentCatalog || catalog;
  inventory = currentInventory || inventory;
  showSignModal();
}

// === Sign-here modal ===

function ensureSignModal() {
  if (document.getElementById('loan-sign-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'loan-sign-overlay';
  overlay.className = 'loan-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Tom Nook Loan Certificate');

  const content = document.createElement('div');
  content.className = 'loan-content loan-parchment';

  const close = document.createElement('button');
  close.className = 'loan-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '×';
  close.addEventListener('click', hideSignModal);
  content.appendChild(close);

  const title = document.createElement('h2');
  title.className = 'loan-title';
  title.textContent = 'Tom Nook Loan Certificate';
  content.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'loan-sub';
  sub.textContent = 'Pre-approved for one (1) free item from the Nook\'s Cranny catalog. Hooo!';
  content.appendChild(sub);

  const sign = document.createElement('button');
  sign.id = 'loan-sign-button';
  sign.type = 'button';
  sign.className = 'loan-sign-button';
  sign.textContent = 'SIGN HERE, HOOO';
  sign.addEventListener('click', () => {
    hideSignModal();
    showPickModal();
  });
  content.appendChild(sign);

  const fine = document.createElement('p');
  fine.className = 'loan-fine-print';
  fine.textContent = 'By signing, the family agrees to the terms of service set forth by Nook Inc., yes yes (subject to change without notice). Bell amount, repayment schedule, and other particulars determined exclusively at the discretion of Tom Nook.';
  content.appendChild(fine);

  overlay.appendChild(content);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideSignModal();
  });
  document.body.appendChild(overlay);
}

function showSignModal() {
  ensureSignModal();
  document.getElementById('loan-sign-overlay').classList.add('is-open');
}
function hideSignModal() {
  const o = document.getElementById('loan-sign-overlay');
  if (o) o.classList.remove('is-open');
}

// === Item-pick modal ===

function ensurePickModal() {
  if (document.getElementById('loan-pick-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'loan-pick-overlay';
  overlay.className = 'loan-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Pick your free item');

  const content = document.createElement('div');
  content.className = 'loan-content';

  const close = document.createElement('button');
  close.className = 'loan-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '×';
  close.addEventListener('click', hidePickModal);
  content.appendChild(close);

  const title = document.createElement('h2');
  title.className = 'loan-title';
  title.textContent = 'Pick Your Free Item, Hooo';
  content.appendChild(title);

  const grid = document.createElement('div');
  grid.id = 'loan-pick-grid';
  grid.className = 'loan-pick-grid';
  content.appendChild(grid);

  overlay.appendChild(content);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hidePickModal();
  });
  document.body.appendChild(overlay);
}

function showPickModal() {
  ensurePickModal();
  renderPickGrid();
  document.getElementById('loan-pick-overlay').classList.add('is-open');
}
function hidePickModal() {
  const o = document.getElementById('loan-pick-overlay');
  if (o) o.classList.remove('is-open');
}

function renderPickGrid() {
  const grid = document.getElementById('loan-pick-grid');
  if (!grid) return;
  grid.replaceChildren();
  for (const [id, item] of Object.entries(catalog || {})) {
    if (BANNED_PICKS.has(id)) continue;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'loan-pick-card';

    const emoji = document.createElement('div');
    emoji.className = 'loan-pick-emoji';
    emoji.textContent = item.emoji || '✨';
    card.appendChild(emoji);

    const name = document.createElement('div');
    name.className = 'loan-pick-name';
    name.textContent = item.name;
    card.appendChild(name);

    card.addEventListener('click', () => redeem(id));
    grid.appendChild(card);
  }
}

async function redeem(itemId) {
  hidePickModal();
  let res, data;
  try {
    res = await fetch(REDEEM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickedItemId: itemId }),
    });
    data = await res.json();
  } catch {
    showToast('🚫 Network hiccup. Try again?', 'error');
    return;
  }
  if (!res.ok) {
    showToast(`🚫 ${(data && data.error) || 'Redemption failed'}`, 'error');
    return;
  }

  // Mirror server state locally.
  if (Array.isArray(data.inventory)) {
    inventory = data.inventory;
    document.dispatchEvent(new CustomEvent('inventory-change', {
      detail: { inventory },
    }));
  }
  if (Number.isFinite(data.miles)) {
    try { localStorage.setItem('whereischloe.bonusMiles', String(data.miles)); } catch {}
    document.dispatchEvent(new CustomEvent('miles-change', {
      detail: { delta: -LOAN_AMOUNT, reason: 'loan-redeem', total: data.miles },
    }));
  }

  // Reveal — smug Nook overlay.
  showRevealOverlay(data.picked);
}

// === Smug-Nook reveal overlay ===

function ensureRevealOverlay() {
  if (document.getElementById('loan-reveal-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'loan-reveal-overlay';
  overlay.className = 'loan-reveal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Tom Nook reveal');

  const content = document.createElement('div');
  content.className = 'loan-reveal-content';

  const portrait = document.createElement('img');
  portrait.className = 'loan-reveal-portrait';
  portrait.src = 'assets/img/tom-nook-smug.png';
  portrait.alt = '';
  portrait.addEventListener('error', () => {
    portrait.src = 'assets/img/tom-nook.png';
  }, { once: true });
  content.appendChild(portrait);

  const speech = document.createElement('div');
  speech.id = 'loan-reveal-speech';
  speech.className = 'loan-reveal-speech';
  content.appendChild(speech);

  const close = document.createElement('button');
  close.className = 'loan-reveal-close';
  close.type = 'button';
  close.textContent = 'Sigh.';
  close.addEventListener('click', hideRevealOverlay);
  content.appendChild(close);

  overlay.appendChild(content);
  document.body.appendChild(overlay);
}

function showRevealOverlay(picked) {
  ensureRevealOverlay();
  const speech = document.getElementById('loan-reveal-speech');
  if (speech) {
    const itemName = (picked && picked.name) || 'your free item';
    speech.textContent =
      `Hooo! Excellent decision, yes yes. ${itemName} has been added to the family inventory. ` +
      `Your loan amount is ${LOAN_AMOUNT.toLocaleString()} Bells, hm-hmm. ` +
      `We will simply collect from your future earnings. Have a wonderful day!`;
  }
  const overlay = document.getElementById('loan-reveal-overlay');
  if (overlay) overlay.classList.add('is-open');

  // The bankruptcy line lands ~2s in for maximum comic timing.
  setTimeout(() => playMichaelBankruptcy(), 2000);
}

function hideRevealOverlay() {
  const o = document.getElementById('loan-reveal-overlay');
  if (o) o.classList.remove('is-open');
}

// === Persistent debt badge (smug Nook + negative number) ===

function ensureDebtBadge() {
  if (document.getElementById('loan-debt-badge')) return;
  const badge = document.createElement('div');
  badge.id = 'loan-debt-badge';
  badge.className = 'loan-debt-badge';
  badge.hidden = true;
  badge.title = 'Tom Nook is patiently waiting for repayment';

  const portrait = document.createElement('img');
  portrait.className = 'loan-debt-portrait';
  portrait.src = 'assets/img/tom-nook-smug.png';
  portrait.alt = '';
  // Fall back to the regular Nook portrait if the smug variant 404s.
  portrait.addEventListener('error', () => {
    portrait.src = 'assets/img/tom-nook.png';
  }, { once: true });
  badge.appendChild(portrait);

  const text = document.createElement('span');
  text.id = 'loan-debt-text';
  text.className = 'loan-debt-text';
  badge.appendChild(text);

  document.body.appendChild(badge);
}

function updateDebtBadge(total) {
  ensureDebtBadge();
  const badge = document.getElementById('loan-debt-badge');
  const text = document.getElementById('loan-debt-text');
  if (!badge || !text) return;
  if (total < 0) {
    badge.hidden = false;
    text.textContent = total.toLocaleString();
  } else {
    badge.hidden = true;
    text.textContent = '';
  }
}
