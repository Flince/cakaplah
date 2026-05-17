/**
 * localStorage persistence layer for all user progress.
 */

const PREFIX = 'cakapla_';

function key(k) { return PREFIX + k; }

// ===== SRS STATES =====
// Stored as { wordId: srsState }
export function getSrsStates() {
  try {
    return JSON.parse(localStorage.getItem(key('srs')) || '{}');
  } catch { return {}; }
}

export function saveSrsState(wordId, state) {
  const all = getSrsStates();
  all[wordId] = state;
  localStorage.setItem(key('srs'), JSON.stringify(all));
}

export function getSrsState(wordId) {
  return getSrsStates()[wordId] || null;
}

// ===== STREAK =====
export function getStreak() {
  try {
    return JSON.parse(localStorage.getItem(key('streak')) || '{"count":0,"lastDate":null}');
  } catch { return { count: 0, lastDate: null }; }
}

export function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const streak = getStreak();

  if (streak.lastDate === today) return streak; // already updated today

  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  if (streak.lastDate === yesterday) {
    streak.count += 1;
  } else if (streak.lastDate !== today) {
    streak.count = 1; // broken streak
  }
  streak.lastDate = today;
  localStorage.setItem(key('streak'), JSON.stringify(streak));
  return streak;
}

// ===== XP =====
export function getXP() {
  return parseInt(localStorage.getItem(key('xp')) || '0', 10);
}

export function addXP(amount) {
  const current = getXP();
  const next = current + amount;
  localStorage.setItem(key('xp'), String(next));
  return next;
}

// ===== ACTIVITY LOG (for heatmap) =====
// Stores { 'YYYY-MM-DD': count } for last 90 days
export function getActivity() {
  try {
    return JSON.parse(localStorage.getItem(key('activity')) || '{}');
  } catch { return {}; }
}

export function logActivity(count = 1) {
  const today = new Date().toISOString().slice(0, 10);
  const activity = getActivity();
  activity[today] = (activity[today] || 0) + count;
  localStorage.setItem(key('activity'), JSON.stringify(activity));
}

// ===== WEEKLY XP (for chart) =====
// Returns array of 7 XP values [oldest ... today]
export function getWeeklyXP() {
  try {
    return JSON.parse(localStorage.getItem(key('weeklyXP')) || 'null') || Array(7).fill(0);
  } catch { return Array(7).fill(0); }
}

export function addWeeklyXP(amount) {
  const today = new Date().toISOString().slice(0, 10);
  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem(key('weeklyXPMeta')) || 'null');
    } catch { return null; }
  })();

  let data = Array(7).fill(0);
  let lastDate = null;

  if (stored) {
    data = stored.data;
    lastDate = stored.lastDate;
  }

  if (lastDate !== today) {
    // Shift array: new day
    if (lastDate !== null) {
      const daysDiff = Math.min(7, daysBetween(lastDate, today));
      for (let i = 0; i < daysDiff; i++) {
        data.shift();
        data.push(0);
      }
    }
    lastDate = today;
  }

  data[6] += amount;
  const meta = { data, lastDate };
  localStorage.setItem(key('weeklyXP'), JSON.stringify(data));
  localStorage.setItem(key('weeklyXPMeta'), JSON.stringify(meta));
  return data;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// ===== SETTINGS =====
export function getSetting(k, def) {
  const v = localStorage.getItem(key('setting_' + k));
  return v === null ? def : JSON.parse(v);
}

export function setSetting(k, v) {
  localStorage.setItem(key('setting_' + k), JSON.stringify(v));
}
