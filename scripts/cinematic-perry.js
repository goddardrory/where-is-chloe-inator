// Perry the Platypus rescue cinematic.
//
// Plays a quick zip-across with the Perry sprite + Perry's theme jingle,
// then the caller (self-destruct.js) clears any active Tri-State takeover.

import { playPerryTheme } from './audio.js';

const ROOT_ID = 'perry-rescue-root';

function ensureRoot() {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;
  root = document.createElement('div');
  root.id = ROOT_ID;
  root.className = 'doof-cinematic';
  root.setAttribute('aria-hidden', 'true');

  const perry = document.createElement('img');
  perry.className = 'doof-cinematic-perry';
  perry.id = 'perry-rescue-sprite';
  perry.src = 'assets/img/perry-fly.png';
  perry.alt = '';
  root.appendChild(perry);

  document.body.appendChild(root);
  return root;
}

export function playPerryRescue() {
  return new Promise((resolve) => {
    const root = ensureRoot();
    const perry = root.querySelector('#perry-rescue-sprite');
    root.classList.add('is-active');
    try { playPerryTheme(); } catch {}
    perry.classList.add('zip');

    setTimeout(() => {
      perry.classList.remove('zip');
      root.classList.remove('is-active');
      resolve();
    }, 1400);
  });
}
