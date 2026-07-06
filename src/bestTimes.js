// ---------------------------------------------------------------------------
// Persistent best-times table (OLD CAR vs iCAPCAR). Survives across rounds so
// the final contrast stays on-screen and undeniable, per the brief.
// ---------------------------------------------------------------------------

const KEY = 'drive.bestTimes.v1';

export function loadBestTimes() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return {
        old: typeof d.old === 'number' ? d.old : null,
        icap: typeof d.icap === 'number' ? d.icap : null,
      };
    }
  } catch (e) {
    // ignore
  }
  return { old: null, icap: null };
}

// Record a finished run; keeps the faster time. Returns the updated table.
export function recordBestTime(isICap, ms) {
  const best = loadBestTimes();
  const key = isICap ? 'icap' : 'old';
  if (best[key] == null || ms < best[key]) best[key] = ms;
  try {
    localStorage.setItem(KEY, JSON.stringify(best));
  } catch (e) {
    // ignore
  }
  return best;
}

// ms -> "M:SS.d"
export function formatTime(ms) {
  if (ms == null) return '—';
  const cs = Math.floor(ms / 100); // tenths of a second
  const tenths = cs % 10;
  const secs = Math.floor(cs / 10) % 60;
  const mins = Math.floor(cs / 600);
  return `${mins}:${String(secs).padStart(2, '0')}.${tenths}`;
}
