const LAST_ACTIVE_KEY = "octos:lastActiveAt";
const SUGGESTION_KEY = "octos:sleepSuggestion";
const HEARTBEAT_MS = 60_000;
const MIN_GAP_HOURS = 3;
const MAX_GAP_HOURS = 16;

function todayKey() {
  return new Date().toLocaleDateString("sv-SE");
}

/**
 * Call once per app session (e.g. in the protected layout). Uses the gap between the
 * previous heartbeat and now as a proxy for "time away from the app" — there is no way
 * for a website to read the device's actual screen-on/off state — and, if the gap looks
 * like an overnight one, stashes it as today's sleep suggestion for the Saúde form to
 * read. Then starts a heartbeat that keeps refreshing the "last active" timestamp while
 * the app is open, so the next long gap can be measured.
 */
export function trackActivityForSleepSuggestion() {
  const previousRaw = localStorage.getItem(LAST_ACTIVE_KEY);
  const previous = previousRaw ? Number(previousRaw) : NaN;

  if (Number.isFinite(previous)) {
    const gapHours = (Date.now() - previous) / 3_600_000;
    if (gapHours >= MIN_GAP_HOURS && gapHours <= MAX_GAP_HOURS) {
      localStorage.setItem(
        SUGGESTION_KEY,
        JSON.stringify({ hours: Math.round(gapHours * 10) / 10, date: todayKey() })
      );
    }
  }

  const touch = () => localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  touch();

  const interval = setInterval(() => {
    if (document.visibilityState === "visible") touch();
  }, HEARTBEAT_MS);
  document.addEventListener("visibilitychange", touch);
  window.addEventListener("pagehide", touch);

  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", touch);
    window.removeEventListener("pagehide", touch);
  };
}

/** Today's auto-estimated sleep duration (hours), if one was computed this session. */
export function readSleepSuggestion(): number | null {
  const raw = localStorage.getItem(SUGGESTION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { hours: number; date: string };
    return parsed.date === todayKey() ? parsed.hours : null;
  } catch {
    return null;
  }
}
