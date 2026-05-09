// Shop sticker interactivity — every owned item's sticker becomes clickable
// and triggers its defined effect (sound + visual). Lives in this dedicated
// module to keep shop.js focused on inventory state.
//
// Special routing handled OUTSIDE this map (in shop.js renderStickerRow):
//   - 'nook-certificate' → loan.js (opens redemption flow)
//   - 'casino-pass'      → slots.js (opens slot machine)
//   - 'doof-button'      → not in sticker row at all (it's a separate FAB)

import {
  playDwightIdiot,
  playDwightButtlicker,
  playMichaelStayCalm,
  playBoardingChime,
  playQuackVarying,
  playPerry,
  startKK, stopKK,
} from './audio.js';
import { showToast } from './toast.js';
import { startPlantMode } from './trees.js';
import { toggleDiscoMode } from './disco.js';

let pretzelBannerOn = false;
let fedoraCursorOn = false;
let kkVinylOn = false;

const HANDLERS = {
  'pretzel-banner': () => togglePretzelBanner(),
  'beet-sticker':   () => { spawnTractor(); },
  'fedora':         () => { toggleFedoraCursor(); playPerry(); },
  'boss-mug':       () => { playMichaelStayCalm(); spawnFloatingFromSticker('☕', 'boss-mug'); },
  'schrute-bucks':  () => { playDwightIdiot(); spawnFloatingFromSticker('+1 🪙', 'schrute-bucks'); },
  'kk-vinyl':       () => toggleKKVinyl(),
  'goose-hat':      () => { playQuackVarying(); spawnHattedGoose(); },
  'doof-lab-pass':  () => openDoofOverlay(),
  'dodo-pin':       () => {
    playBoardingChime();
    showToast('🛬 Dodo Airlines: "Buckle up, dood! Where ya headin\' today?"', 'success', 3500);
  },
  'tree-sapling':   () => startPlantMode(),
  'disco-ball':     () => toggleDiscoMode(),
};

export function handleStickerClick(itemId) {
  const fn = HANDLERS[itemId];
  if (fn) fn();
}

// Audio that fires on EVERY shop purchase. Schrute Bucks gets idiot instead.
export function playPurchaseSound(itemId) {
  if (itemId === 'schrute-bucks') {
    playDwightIdiot();
  } else {
    playDwightButtlicker();
  }
}

// === Effect implementations ===

function togglePretzelBanner() {
  pretzelBannerOn = !pretzelBannerOn;
  document.body.classList.toggle('pretzel-banner-active', pretzelBannerOn);
  ensurePretzelBanner();
  showToast(pretzelBannerOn ? '🥨 PRETZEL DAY ENABLED' : '🥨 Pretzel Day disabled', 'info', 2500);
}

function ensurePretzelBanner() {
  if (document.getElementById('shop-pretzel-banner')) return;
  const b = document.createElement('div');
  b.id = 'shop-pretzel-banner';
  b.className = 'shop-pretzel-banner';
  b.textContent = '🥨 PRETZEL DAY 🥨';
  document.body.appendChild(b);
}

function toggleFedoraCursor() {
  fedoraCursorOn = !fedoraCursorOn;
  document.body.classList.toggle('konami', fedoraCursorOn);
  showToast(fedoraCursorOn ? '🎩 Fedora cursor on' : '🎩 Fedora cursor off', 'info', 2200);
}

function toggleKKVinyl() {
  kkVinylOn = !kkVinylOn;
  if (kkVinylOn) {
    startKK();
    showToast('🎸 KK Slider: catch a smooth ride', 'success', 2500);
  } else {
    stopKK();
    showToast('🎸 KK Slider: stage cleared', 'info', 2200);
  }
}

function spawnTractor() {
  const t = document.createElement('div');
  t.className = 'shop-fx-tractor';
  t.textContent = '🚜';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 6000);
}

function spawnFloatingFromSticker(text, itemId) {
  // Find the sticker for this item — float emerges from there.
  const stickers = document.querySelectorAll('.shop-sticker');
  let anchor = null;
  for (const s of stickers) {
    if (s.dataset.itemId === itemId) { anchor = s; break; }
  }
  const rect = anchor ? anchor.getBoundingClientRect() : { left: 16, top: window.innerHeight - 60, width: 32, height: 32 };

  const f = document.createElement('div');
  f.className = 'shop-fx-floating';
  f.textContent = text;
  f.style.left = (rect.left + rect.width / 2) + 'px';
  f.style.top  = (rect.top + rect.height / 2) + 'px';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 2200);
}

function spawnHattedGoose() {
  const g = document.createElement('div');
  g.className = 'shop-fx-hatted-goose';
  const img = document.createElement('img');
  img.src = 'assets/img/goose-walk.gif';
  img.alt = '';
  g.appendChild(img);
  const hat = document.createElement('div');
  hat.className = 'shop-fx-hat';
  hat.textContent = '🧢';
  g.appendChild(hat);
  document.body.appendChild(g);
  setTimeout(() => g.remove(), 9500);
}

function openDoofOverlay() {
  const overlay = document.getElementById('doof-overlay');
  if (!overlay) return;
  overlay.classList.add('is-open');
  // The site already has a Doof overlay with a close handler wired in
  // easter-eggs.js — we just trigger it here by toggling the open class.
}
