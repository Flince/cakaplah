/**
 * SM-2 Spaced Repetition Algorithm
 * Per-word state: interval, repetitions, easeFactor, nextReviewDate, failCount
 * Ratings: 0=Again, 1=Hard, 2=Good, 3=Easy
 */

export const RATING = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

export function createWordState() {
  return {
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    nextReviewDate: todayStr(),
    failCount: 0,
    lastReviewed: null,
  };
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function isDueToday(state) {
  return state.nextReviewDate <= todayStr();
}

/**
 * Apply SM-2 to a word state given a quality rating (0-3).
 * Returns new state object (immutable update).
 */
export function applyRating(state, rating) {
  const s = { ...state };
  const now = todayStr();
  s.lastReviewed = now;

  if (rating === RATING.AGAIN) {
    // Fail: reset repetitions, short interval, ease factor drops
    s.repetitions = 0;
    s.interval = 1;
    s.easeFactor = Math.max(1.3, s.easeFactor - 0.2);
    s.failCount = (s.failCount || 0) + 1;
  } else {
    // Quality mapping: Hard=3, Good=4, Easy=5 (SM-2 uses 0-5 scale)
    const q = rating === RATING.HARD ? 3 : rating === RATING.GOOD ? 4 : 5;

    if (s.repetitions === 0) {
      s.interval = 1;
    } else if (s.repetitions === 1) {
      s.interval = 6;
    } else {
      s.interval = Math.round(s.interval * s.easeFactor);
    }

    s.easeFactor = Math.max(1.3, s.easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    s.repetitions += 1;

    if (rating === RATING.EASY) {
      s.interval = Math.round(s.interval * 1.3);
    } else if (rating === RATING.HARD) {
      s.interval = Math.max(1, Math.round(s.interval * 0.8));
    }
  }

  s.interval = Math.max(1, s.interval);
  s.nextReviewDate = addDays(now, s.interval);
  return s;
}

/**
 * Return preview interval string for rating buttons.
 */
export function previewInterval(state, rating) {
  const next = applyRating(state, rating);
  const d = next.interval;
  if (d === 1) return '1 hari';
  if (d < 7)   return `${d} hari`;
  if (d < 30)  return `${Math.round(d / 7)} minggu`;
  return `${Math.round(d / 30)} bulan`;
}

export function getMasteryLevel(state) {
  if (!state || state.repetitions === 0) return 'new';
  if (state.interval < 7) return 'learning';
  if (state.interval < 21) return 'review';
  return 'mastered';
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
