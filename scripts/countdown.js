// Format a number of milliseconds as DD HH:MM:SS or HH:MM:SS depending on size.
export function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Friendlier short form for use in body copy: "12 hours, 4 minutes"
export function formatCountdownLong(ms) {
  if (ms <= 0) return 'now';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  if (minutes === 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${hours}h ${minutes}m`;
}

// Relative time formatting for messages: "2 minutes ago"
export function formatRelative(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day === 1 ? '' : 's'} ago`;
}
