// Doofenshmirtz Self-Destruct cinematic.
//
// playDoofDetonation()  → 4s scene: screen-shake, Doof in lab, explosion,
//                         Perry zip-across, fade. Used when self-destruct
//                         detonates and miles are wiped.
//
// playDoofSaved()       → 2.4s scene: Doof briefly appears, shield 🛡️ pops up
//                         and absorbs the blast. Used when an Immunity Token
//                         absorbs the detonation.
//
// All visuals are CSS-driven. Assets reused: assets/img/doof.png,
// assets/img/perry-fly.png. Audio reused: doofJingle, explosion, perryTheme.

import { playDoofJingle, playExplosion, playPerryTheme } from './audio.js';

const ROOT_ID = 'doof-cinematic-root';
const SHIELD_ROOT_ID = 'doof-shield-root';

function ensureRoot() {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;
  root = document.createElement('div');
  root.id = ROOT_ID;
  root.className = 'doof-cinematic';
  root.setAttribute('aria-hidden', 'true');

  const explosion = document.createElement('div');
  explosion.className = 'doof-cinematic-explosion';
  explosion.id = 'doof-cinematic-explosion';
  explosion.textContent = '💥';
  root.appendChild(explosion);

  const doof = document.createElement('img');
  doof.className = 'doof-cinematic-doof';
  doof.src = 'assets/img/doof.png';
  doof.alt = '';
  root.appendChild(doof);

  const perry = document.createElement('img');
  perry.className = 'doof-cinematic-perry';
  perry.id = 'doof-cinematic-perry';
  perry.src = 'assets/img/perry-fly.png';
  perry.alt = '';
  root.appendChild(perry);

  document.body.appendChild(root);
  return root;
}

function ensureShieldRoot() {
  let root = document.getElementById(SHIELD_ROOT_ID);
  if (root) return root;
  root = document.createElement('div');
  root.id = SHIELD_ROOT_ID;
  root.className = 'shield-save';
  const icon = document.createElement('div');
  icon.className = 'shield-save-icon';
  icon.textContent = '🛡️';
  root.appendChild(icon);
  document.body.appendChild(root);
  return root;
}

export function playDoofDetonation() {
  return new Promise((resolve) => {
    const root = ensureRoot();
    const explosion = root.querySelector('#doof-cinematic-explosion');
    const perry = root.querySelector('#doof-cinematic-perry');

    document.body.classList.add('doof-shake');
    root.classList.add('is-active');
    try { playDoofJingle(); } catch {}

    setTimeout(() => {
      try { playExplosion(); } catch {}
      explosion.classList.add('boom');
    }, 1800);

    setTimeout(() => {
      try { playPerryTheme(); } catch {}
      perry.classList.add('zip');
    }, 2500);

    setTimeout(() => {
      document.body.classList.remove('doof-shake');
      root.classList.remove('is-active');
      explosion.classList.remove('boom');
      perry.classList.remove('zip');
      resolve();
    }, 4000);
  });
}

export function playDoofSaved() {
  return new Promise((resolve) => {
    const root = ensureRoot();
    const shield = ensureShieldRoot();
    const explosion = root.querySelector('#doof-cinematic-explosion');

    document.body.classList.add('doof-shake');
    root.classList.add('is-active');
    try { playDoofJingle(); } catch {}

    setTimeout(() => {
      shield.classList.add('is-active');
      explosion.classList.add('boom');
      try { playExplosion(); } catch {}
    }, 1100);

    setTimeout(() => {
      document.body.classList.remove('doof-shake');
      root.classList.remove('is-active');
      shield.classList.remove('is-active');
      explosion.classList.remove('boom');
      resolve();
    }, 2400);
  });
}
