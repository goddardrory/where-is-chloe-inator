// Settings gear ⚙️ — per-device personal toggles for unlocked small rewards.
//
// Each row in the modal corresponds to one of the 7 small rewards. Locked
// rewards are greyed-out with 🔒. Unlocked rewards get a real toggle switch
// that enables/disables that particular cosmetic for THIS device only.

import {
  SMALL_REWARD_IDS,
  SMALL_REWARD_META,
  isUnlocked,
  isEnabled,
  setEnabled,
} from './unlocks.js';

export function initSettingsGear() {
  const btn = document.getElementById('settings-button');
  if (btn) btn.addEventListener('click', open);

  const closeBtn = document.getElementById('settings-close');
  if (closeBtn) closeBtn.addEventListener('click', close);

  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  // Re-render when an unlock is granted while the panel is open.
  document.addEventListener('unlock-change', () => {
    if (isOpen()) render();
  });
}

function isOpen() {
  const o = document.getElementById('settings-overlay');
  return !!o && o.classList.contains('is-open');
}

function open() {
  const o = document.getElementById('settings-overlay');
  if (!o) return;
  render();
  o.classList.add('is-open');
}

function close() {
  const o = document.getElementById('settings-overlay');
  if (o) o.classList.remove('is-open');
}

function render() {
  const list = document.getElementById('settings-list');
  if (!list) return;
  list.replaceChildren();

  for (const id of SMALL_REWARD_IDS) {
    const meta = SMALL_REWARD_META[id];
    const unlocked = isUnlocked(id);

    const row = document.createElement('div');
    row.className = 'settings-row' + (unlocked ? '' : ' is-locked');

    const emoji = document.createElement('span');
    emoji.className = 'settings-row-emoji';
    emoji.textContent = meta.emoji;
    row.appendChild(emoji);

    const text = document.createElement('div');
    text.className = 'settings-row-text';
    const name = document.createElement('div');
    name.className = 'settings-row-name';
    name.textContent = meta.label;
    text.appendChild(name);
    const desc = document.createElement('div');
    desc.className = 'settings-row-desc';
    desc.textContent = unlocked
      ? meta.desc
      : 'Locked — press the Self-Destruct-inator to roll for this.';
    text.appendChild(desc);
    row.appendChild(text);

    if (unlocked) {
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.className = 'settings-toggle';
      toggle.checked = isEnabled(id);
      toggle.setAttribute('aria-label', `${meta.label} toggle`);
      toggle.addEventListener('change', () => setEnabled(id, toggle.checked));
      row.appendChild(toggle);
    } else {
      const lock = document.createElement('span');
      lock.className = 'settings-row-lock';
      lock.textContent = '🔒';
      row.appendChild(lock);
    }

    list.appendChild(row);
  }
}
