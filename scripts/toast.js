// Tiny toast helper. Used by easter-eggs and message submission.
export function showToast(text, kind = '', durationMs = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${kind}`.trim();
  toast.textContent = text;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 320);
  }, durationMs);
}
