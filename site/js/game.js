// Game rules. Pure functions over a plain state object (unit-tested in tests/unit/game.test.mjs).
// All functions take `now` (ms) so tests can control time.
import { dayKey, addDays, daysBetween } from "./util.js";

export const SCHEMA_VERSION = 1;
export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 30 * 60 * 1000;
export const XP = {
  firstTry: 10,
  corrected: 5,
  lessonComplete: 20,
  perfect: 10,
  review: 5,
  mixComplete: 20,
};
/** Leitner: box -> days until next review after a correct answer in that box. */
export const LEITNER_NEXT = { 1: 1, 2: 3 };
const DAILY_KEEP_DAYS = 120;

export function newState(now = Date.now()) {
  return {
    v: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    xp: 0,
    streak: { count: 0, best: 0, lastDate: null },
    hearts: { n: MAX_HEARTS, at: now },
    lessons: {},
    questions: {},
    daily: {},
    settings: { theme: "auto", unlimitedHearts: false, mixTimer: false },
  };
}

/** Bring any stored object up to the current schema (tolerates missing fields). */
export function migrate(raw, now = Date.now()) {
  const base = newState(now);
  if (!raw || typeof raw !== "object") return base;
  const s = {
    ...base,
    ...raw,
    streak: { ...base.streak, ...(raw.streak || {}) },
    hearts: { ...base.hearts, ...(raw.hearts || {}) },
    lessons: { ...(raw.lessons || {}) },
    questions: { ...(raw.questions || {}) },
    daily: { ...(raw.daily || {}) },
    settings: { ...base.settings, ...(raw.settings || {}) },
  };
  s.v = SCHEMA_VERSION;
  s.xp = Math.max(0, Number(s.xp) || 0);
  s.hearts.n = Math.min(MAX_HEARTS, Math.max(0, Number(s.hearts.n) || 0));
  return s;
}

// ---------- level ----------
/** XP needed (cumulative) to reach level L (L >= 1). L1 = 0, L2 = 50, L3 = 150, L4 = 300 … */
export function xpForLevel(L) {
  return 25 * L * (L - 1);
}

export function levelInfo(xp) {
  let L = 1;
  while (xpForLevel(L + 1) <= xp) L++;
  const from = xpForLevel(L);
  const to = xpForLevel(L + 1);
  return { level: L, into: xp - from, span: to - from, toNext: to - xp };
}

// ---------- hearts ----------
/** Current hearts after regeneration (does not mutate). */
export function heartsNow(state, now = Date.now()) {
  const { n, at } = state.hearts;
  if (n >= MAX_HEARTS) return { n: MAX_HEARTS, at: now, nextInMs: 0 };
  const gained = Math.floor(Math.max(0, now - at) / HEART_REGEN_MS);
  const total = Math.min(MAX_HEARTS, n + gained);
  if (total >= MAX_HEARTS) return { n: MAX_HEARTS, at: now, nextInMs: 0 };
  const newAt = at + gained * HEART_REGEN_MS;
  return { n: total, at: newAt, nextInMs: HEART_REGEN_MS - (now - newAt) };
}

export function syncHearts(state, now = Date.now()) {
  const h = heartsNow(state, now);
  state.hearts = { n: h.n, at: h.at };
  return h;
}

export function loseHeart(state, now = Date.now()) {
  if (state.settings.unlimitedHearts) return state.hearts.n;
  const h = syncHearts(state, now);
  // regeneration clock starts when you drop below max
  state.hearts = { n: Math.max(0, h.n - 1), at: h.n >= MAX_HEARTS ? now : h.at };
  touch(state, now);
  return state.hearts.n;
}

export function gainHeart(state, now = Date.now()) {
  const h = syncHearts(state, now);
  if (h.n >= MAX_HEARTS) return MAX_HEARTS;
  state.hearts = { n: h.n + 1, at: h.n + 1 >= MAX_HEARTS ? now : h.at };
  touch(state, now);
  return state.hearts.n;
}

export function canStartLesson(state, now = Date.now()) {
  return state.settings.unlimitedHearts || heartsNow(state, now).n > 0;
}

// ---------- xp / daily ----------
export function addXp(state, amount, now = Date.now()) {
  if (!amount) return;
  state.xp += amount;
  const d = dayKey(now);
  state.daily[d] = (state.daily[d] || 0) + amount;
  // keep the daily map bounded
  const cutoff = addDays(d, -DAILY_KEEP_DAYS);
  for (const k of Object.keys(state.daily)) if (k < cutoff) delete state.daily[k];
  touch(state, now);
}

// ---------- streak ----------
/** Streak value to display today (0 if broken). */
export function streakNow(state, now = Date.now()) {
  const { count, lastDate } = state.streak;
  if (!lastDate) return 0;
  const gap = daysBetween(lastDate, dayKey(now));
  return gap <= 1 ? count : 0;
}

/** Record activity for today (call when a lesson / review / mix session completes). */
export function recordActivity(state, now = Date.now()) {
  const today = dayKey(now);
  const { count, lastDate, best } = state.streak;
  let next;
  if (lastDate === today) next = count;
  else if (lastDate && daysBetween(lastDate, today) === 1) next = count + 1;
  else next = 1;
  state.streak = { count: next, best: Math.max(best || 0, next), lastDate: today };
  touch(state, now);
  return next;
}

// ---------- per-question record + Leitner review ----------
function qrec(state, id) {
  return (state.questions[id] ||= { seen: 0, right: 0, wrong: 0, box: 0, due: null, at: 0 });
}

/**
 * Register an answer.
 * mode: "lesson" | "review" | "mix"
 * Returns the updated record.
 */
export function recordAnswer(state, id, correct, mode, now = Date.now()) {
  const r = qrec(state, id);
  const today = dayKey(now);
  r.seen++;
  if (correct) r.right++;
  else r.wrong++;
  if (!correct) {
    r.box = 1;
    r.due = today;
  } else if (mode === "review" && r.box > 0) {
    if (r.box >= 3) {
      r.box = 0;
      r.due = null;
    } else {
      const days = LEITNER_NEXT[r.box];
      r.box += 1;
      r.due = addDays(today, days);
    }
  }
  r.at = now;
  touch(state, now);
  return r;
}

export function reviewDue(state, now = Date.now()) {
  const today = dayKey(now);
  return Object.entries(state.questions)
    .filter(([, r]) => r.box > 0 && r.due && r.due <= today)
    .map(([id]) => id);
}

export function reviewAll(state) {
  return Object.entries(state.questions)
    .filter(([, r]) => r.box > 0)
    .map(([id]) => id);
}

// ---------- lessons / unlock ----------
export function completeLesson(state, lessonId, { accuracy, perfect }, now = Date.now()) {
  const prev = state.lessons[lessonId];
  state.lessons[lessonId] = {
    done: true,
    best: Math.max(prev?.best || 0, accuracy),
    times: (prev?.times || 0) + 1,
    at: now,
  };
  addXp(state, XP.lessonComplete + (perfect ? XP.perfect : 0), now);
  recordActivity(state, now);
  return state.lessons[lessonId];
}

/**
 * Unlock rules. units: [{id, lessons:[{id}]}] (lesson ids only).
 *  - unit 0 is open; unit k opens when the first lesson of unit k-1 is done
 *  - lesson 0 of an open unit is open; lesson i opens when lesson i-1 is done
 */
export function isUnitUnlocked(state, units, unitIndex) {
  if (unitIndex <= 0) return true;
  const prev = units[unitIndex - 1];
  return Boolean(prev && state.lessons[prev.lessons[0]?.id]?.done);
}

export function isLessonUnlocked(state, units, unitIndex, lessonIndex) {
  if (!isUnitUnlocked(state, units, unitIndex)) return false;
  if (lessonIndex <= 0) return true;
  const prevId = units[unitIndex].lessons[lessonIndex - 1].id;
  return Boolean(state.lessons[prevId]?.done);
}

/** First unlocked-but-not-done lesson, scanning in order. Returns {unitIndex, lessonIndex} or null. */
export function nextLesson(state, units) {
  for (let u = 0; u < units.length; u++) {
    if (!isUnitUnlocked(state, units, u)) continue;
    for (let l = 0; l < units[u].lessons.length; l++) {
      if (!isLessonUnlocked(state, units, u, l)) break;
      if (!state.lessons[units[u].lessons[l].id]?.done) return { unitIndex: u, lessonIndex: l };
    }
  }
  return null;
}

export function touch(state, now = Date.now()) {
  state.updatedAt = Math.max(state.updatedAt || 0, now);
}
