// +5,000 Nook Miles jackpot — gold-coin shower.
//
// Drops 36 gold-coin emoji from the top edge for ~3.5 seconds. Pure visual;
// the +5000 has already been applied server-side by the time this plays.

const ROOT_ID = 'coin-shower-root';
const COIN_COUNT = 36;

function ensureRoot() {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;
  root = document.createElement('div');
  root.id = ROOT_ID;
  root.className = 'coin-shower';
  root.setAttribute('aria-hidden', 'true');
  document.body.appendChild(root);
  return root;
}

export function playMilesJackpot() {
  return new Promise((resolve) => {
    const root = ensureRoot();
    root.replaceChildren();
    root.classList.add('is-active');

    for (let i = 0; i < COIN_COUNT; i++) {
      const c = document.createElement('div');
      c.className = 'coin-shower-coin';
      c.textContent = ['🪙', '⭐', '💰'][i % 3];
      c.style.left = (Math.random() * 100) + 'vw';
      const dur = 2.4 + Math.random() * 1.6;
      const delay = Math.random() * 0.8;
      c.style.animation = `coin-fall ${dur}s ease-in ${delay}s forwards`;
      root.appendChild(c);
    }

    setTimeout(() => {
      root.classList.remove('is-active');
      root.replaceChildren();
      resolve();
    }, 3500);
  });
}
