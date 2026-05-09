// Tri-State Area Takeover — Doof's grandest jackpot.
//
// Visually: page rotates 180° and a banner sits at the top of the (flipped)
// viewport. Driven by a server-side blob flag (`jackpotActive = "tristate"`).
// Apply on page load if active; clear on Perry rescue or any subsequent
// Self-Destruct-inator press.

export function applyTristate() {
  document.body.classList.add('tristate-active');
  const banner = document.getElementById('tristate-banner');
  if (banner) banner.hidden = false;
}

export function removeTristate() {
  document.body.classList.remove('tristate-active');
  const banner = document.getElementById('tristate-banner');
  if (banner) banner.hidden = true;
}

export function isTristateActive() {
  return document.body.classList.contains('tristate-active');
}
