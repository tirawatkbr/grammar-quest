// Merge two progress states (used by sync code and Firebase).
// Commutative for everything except `settings`, which always stays from `local` (device preference).
import { migrate } from "./game.js";

function pickNewer(a, b, timeKey) {
  if (!a) return b;
  if (!b) return a;
  const ta = a[timeKey] || 0;
  const tb = b[timeKey] || 0;
  if (ta !== tb) return ta > tb ? a : b;
  // deterministic tie-break
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
}

export function mergeStates(localRaw, remoteRaw, now = Date.now()) {
  const a = migrate(localRaw, now);
  const b = migrate(remoteRaw, now);
  const out = migrate(null, now);

  out.createdAt = Math.min(a.createdAt || now, b.createdAt || now);
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  out.xp = Math.max(a.xp, b.xp);

  // daily xp — max per day
  for (const k of new Set([...Object.keys(a.daily), ...Object.keys(b.daily)])) {
    out.daily[k] = Math.max(a.daily[k] || 0, b.daily[k] || 0);
  }

  // streak — later lastDate wins; same date → larger count
  const sa = a.streak;
  const sb = b.streak;
  let s;
  if ((sa.lastDate || "") !== (sb.lastDate || "")) s = (sa.lastDate || "") > (sb.lastDate || "") ? sa : sb;
  else s = sa.count >= sb.count ? sa : sb;
  out.streak = { count: s.count, lastDate: s.lastDate, best: Math.max(sa.best || 0, sb.best || 0, s.count) };

  // hearts — from the more recently updated device; tie → fewer hearts (conservative)
  if (a.updatedAt !== b.updatedAt) out.hearts = { ...(a.updatedAt > b.updatedAt ? a : b).hearts };
  else if (a.hearts.n !== b.hearts.n) out.hearts = { ...(a.hearts.n < b.hearts.n ? a : b).hearts };
  else out.hearts = { n: a.hearts.n, at: Math.max(a.hearts.at || 0, b.hearts.at || 0) };

  // lessons — union
  for (const id of new Set([...Object.keys(a.lessons), ...Object.keys(b.lessons)])) {
    const x = a.lessons[id] || {};
    const y = b.lessons[id] || {};
    out.lessons[id] = {
      done: Boolean(x.done || y.done),
      best: Math.max(x.best || 0, y.best || 0),
      times: Math.max(x.times || 0, y.times || 0),
      at: Math.max(x.at || 0, y.at || 0),
    };
  }

  // questions — newer record wins
  for (const id of new Set([...Object.keys(a.questions), ...Object.keys(b.questions)])) {
    out.questions[id] = { ...pickNewer(a.questions[id], b.questions[id], "at") };
  }

  out.settings = { ...a.settings };
  return out;
}

/** Short human summary used before confirming an import. */
export function summarize(state) {
  const s = migrate(state);
  return {
    xp: s.xp,
    lessonsDone: Object.values(s.lessons).filter((l) => l.done).length,
    streak: s.streak.count,
    reviewItems: Object.values(s.questions).filter((q) => q.box > 0).length,
    updatedAt: s.updatedAt,
  };
}
