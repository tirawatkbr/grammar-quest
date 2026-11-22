// Content loading. data/units.js is a generated manifest (scripts/build-manifest.mjs);
// full unit files are loaded on demand.
import { UNITS } from "../data/units.js";

const cache = new Map();

export function getUnits() {
  return UNITS;
}

export function unitIndexById(id) {
  return UNITS.findIndex((u) => u.id === id);
}

export async function loadUnit(id) {
  if (!cache.has(id)) {
    const meta = UNITS.find((u) => u.id === id);
    if (!meta) throw new Error("Unknown unit " + id);
    cache.set(id, import(`../data/${meta.file}`).then((m) => m.default));
  }
  return cache.get(id);
}

/** Find lesson position {unitIndex, lessonIndex} from a lesson id. */
export function locateLesson(lessonId) {
  for (let u = 0; u < UNITS.length; u++) {
    const l = UNITS[u].lessons.findIndex((x) => x.id === lessonId);
    if (l >= 0) return { unitIndex: u, lessonIndex: l };
  }
  return null;
}

/** Question id "u07-l2-q03" → unit id "u07". */
export function unitOfQuestion(qid) {
  return qid.split("-")[0];
}

/** Load full question objects for a list of ids (skips ids that no longer exist). */
export async function loadQuestions(ids) {
  const byUnit = new Map();
  for (const id of ids) {
    const u = unitOfQuestion(id);
    if (!byUnit.has(u)) byUnit.set(u, []);
    byUnit.get(u).push(id);
  }
  const found = new Map();
  await Promise.all(
    [...byUnit.keys()].map(async (u) => {
      if (!UNITS.some((x) => x.id === u)) return;
      const unit = await loadUnit(u);
      for (const lesson of unit.lessons) {
        for (const q of lesson.questions) found.set(q.id, { ...q, unitId: unit.id, lessonId: lesson.id });
      }
    }),
  );
  return ids.map((id) => found.get(id)).filter(Boolean);
}

/** Summary card lookup for a question (by unit + summaryRef index). */
export async function summaryFor(q) {
  const unit = await loadUnit(q.unitId || unitOfQuestion(q.id));
  const card = unit.summary[q.summaryRef ?? 0];
  return { unit, card };
}
