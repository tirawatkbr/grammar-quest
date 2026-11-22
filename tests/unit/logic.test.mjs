// Unit tests for pure logic. Run: node --test tests/unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, matchesAny, checkAnswer, isComplete } from "../../site/js/check.js";
import {
  newState, migrate, levelInfo, xpForLevel, heartsNow, loseHeart, gainHeart, HEART_REGEN_MS, MAX_HEARTS,
  addXp, recordActivity, streakNow, recordAnswer, reviewDue, reviewAll, completeLesson,
  isUnitUnlocked, isLessonUnlocked, nextLesson, canStartLesson,
} from "../../site/js/game.js";
import { mergeStates, summarize } from "../../site/js/merge.js";
import { encodeState, decodeState, SyncCodeError, crc32 } from "../../site/js/sync-code.js";
import { dayKey, addDays, daysBetween, tokenizeRich, plain } from "../../site/js/util.js";

// Bangkok = UTC+7. 2026-11-22 10:00 Bangkok = 03:00 UTC
const T0 = Date.UTC(2026, 10, 22, 3, 0, 0);
const DAY = 86400000;

test("normalize: case, spaces, quotes, contractions, final period", () => {
  assert.equal(normalize("  Has  Been Living. "), "has been living");
  assert.equal(normalize("haven’t"), "have not");
  assert.equal(normalize("won't"), "will not");
  assert.equal(normalize("can't"), "cannot");
  assert.equal(normalize("can not"), "cannot");
  assert.equal(normalize("They're here"), "they are here");
  assert.equal(normalize("It'll rain"), "it will rain");
  assert.equal(normalize("hello , world"), "hello, world");
});

test("matchesAny accepts any listed variant, rejects empty", () => {
  assert.ok(matchesAny("Has not finished", ["hasn't finished"]));
  assert.ok(matchesAny("n.", ["noun", "n", "n."]));
  assert.ok(!matchesAny("", ["noun"]));
  assert.ok(!matchesAny("verb", ["noun", "n"]));
});

test("checkAnswer per type", () => {
  assert.ok(checkAnswer({ type: "mcq", answer: "b" }, "b").correct);
  assert.ok(!checkAnswer({ type: "mcq", answer: "b" }, "a").correct);
  assert.ok(checkAnswer({ type: "mcq", answer: "b", alsoCorrect: ["c"] }, "c").correct);
  assert.ok(checkAnswer({ type: "error", answer: 3 }, 3).correct);
  const cf = checkAnswer({ type: "choice-fill", answer: ["the", ["a", "an"]] }, ["the", "an"]);
  assert.ok(cf.correct);
  assert.deepEqual(checkAnswer({ type: "choice-fill", answer: ["the", "a"] }, ["a", "a"]).perBlank, [false, true]);
  const tf = checkAnswer({ type: "type-fill", answer: [["success"], ["noun", "n"]] }, ["Success", "N"]);
  assert.ok(tf.correct);
  assert.ok(checkAnswer({ type: "order", answer: "If I were you, I would go.", accept: ["I would go if I were you."] }, "I would go if I were you.".split(" ")).correct);
  assert.ok(!checkAnswer({ type: "order", answer: "I am here." }, ["here", "I", "am."]).correct);
});

test("isComplete", () => {
  assert.ok(!isComplete({ type: "mcq" }, null));
  assert.ok(isComplete({ type: "mcq" }, "a"));
  assert.ok(!isComplete({ type: "type-fill", answer: ["x", "y"] }, ["a", " "]));
  assert.ok(isComplete({ type: "choice-fill", answer: ["x"] }, ["a"]));
  assert.ok(isComplete({ type: "error" }, 2));
});

test("dates in Bangkok time", () => {
  assert.equal(dayKey(T0), "2026-11-22");
  // 2026-11-22 23:30 Bangkok = 16:30 UTC; +1h crosses midnight in Bangkok
  const late = Date.UTC(2026, 10, 22, 16, 30);
  assert.equal(dayKey(late), "2026-11-22");
  assert.equal(dayKey(late + 3600000), "2026-11-23");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(daysBetween("2026-02-27", "2026-03-01"), 2);
});

test("level curve", () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(2), 50);
  assert.equal(xpForLevel(3), 150);
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(49).level, 1);
  assert.equal(levelInfo(50).level, 2);
  assert.deepEqual(levelInfo(160), { level: 3, into: 10, span: 150, toNext: 140 });
});

test("hearts lose, regenerate every 30 min, cap at max", () => {
  const s = newState(T0);
  loseHeart(s, T0);
  loseHeart(s, T0 + 1000);
  assert.equal(s.hearts.n, 3);
  assert.equal(heartsNow(s, T0 + HEART_REGEN_MS - 1).n, 3);
  assert.equal(heartsNow(s, T0 + HEART_REGEN_MS).n, 4);
  assert.equal(heartsNow(s, T0 + 10 * HEART_REGEN_MS).n, MAX_HEARTS);
  for (let i = 0; i < 10; i++) loseHeart(s, T0 + 2000);
  assert.equal(s.hearts.n, 0);
  assert.ok(!canStartLesson(s, T0 + 2000));
  gainHeart(s, T0 + 3000);
  assert.equal(s.hearts.n, 1);
  s.settings.unlimitedHearts = true;
  loseHeart(s, T0 + 4000);
  assert.equal(s.hearts.n, 1);
  assert.ok(canStartLesson(s, T0 + 4000));
});

test("xp and daily map", () => {
  const s = newState(T0);
  addXp(s, 10, T0);
  addXp(s, 5, T0 + 1000);
  addXp(s, 7, T0 + DAY);
  assert.equal(s.xp, 22);
  assert.equal(s.daily["2026-11-22"], 15);
  assert.equal(s.daily["2026-11-23"], 7);
});

test("streak: same day, next day, gap", () => {
  const s = newState(T0);
  assert.equal(recordActivity(s, T0), 1);
  assert.equal(recordActivity(s, T0 + 1000), 1);
  assert.equal(recordActivity(s, T0 + DAY), 2);
  assert.equal(streakNow(s, T0 + 2 * DAY), 2);
  assert.equal(streakNow(s, T0 + 3 * DAY), 0);
  assert.equal(recordActivity(s, T0 + 3 * DAY), 1);
  assert.equal(s.streak.best, 2);
});

test("Leitner review boxes", () => {
  const s = newState(T0);
  recordAnswer(s, "u01-l1-q01", false, "lesson", T0);
  assert.deepEqual(reviewDue(s, T0), ["u01-l1-q01"]);
  recordAnswer(s, "u01-l1-q01", true, "review", T0);
  assert.equal(s.questions["u01-l1-q01"].box, 2);
  assert.deepEqual(reviewDue(s, T0), []);
  assert.deepEqual(reviewDue(s, T0 + DAY), ["u01-l1-q01"]);
  recordAnswer(s, "u01-l1-q01", true, "review", T0 + DAY);
  assert.equal(s.questions["u01-l1-q01"].box, 3);
  assert.deepEqual(reviewDue(s, T0 + 3 * DAY), []);
  assert.deepEqual(reviewDue(s, T0 + 4 * DAY), ["u01-l1-q01"]);
  recordAnswer(s, "u01-l1-q01", true, "review", T0 + 4 * DAY);
  assert.equal(s.questions["u01-l1-q01"].box, 0);
  assert.deepEqual(reviewAll(s), []);
  // correct in a lesson does not graduate a review item
  recordAnswer(s, "x", false, "lesson", T0);
  recordAnswer(s, "x", true, "lesson", T0);
  assert.equal(s.questions.x.box, 1);
});

test("unlock rules and next lesson", () => {
  const units = [
    { id: "u01", lessons: [{ id: "u01-l1" }, { id: "u01-l2" }] },
    { id: "u02", lessons: [{ id: "u02-l1" }] },
  ];
  const s = newState(T0);
  assert.ok(isUnitUnlocked(s, units, 0));
  assert.ok(!isUnitUnlocked(s, units, 1));
  assert.ok(isLessonUnlocked(s, units, 0, 0));
  assert.ok(!isLessonUnlocked(s, units, 0, 1));
  assert.deepEqual(nextLesson(s, units), { unitIndex: 0, lessonIndex: 0 });
  completeLesson(s, "u01-l1", { accuracy: 80, perfect: false }, T0);
  assert.ok(isUnitUnlocked(s, units, 1));
  assert.ok(isLessonUnlocked(s, units, 0, 1));
  assert.deepEqual(nextLesson(s, units), { unitIndex: 0, lessonIndex: 1 });
  assert.equal(s.xp, 20);
  completeLesson(s, "u01-l2", { accuracy: 100, perfect: true }, T0);
  assert.equal(s.xp, 50);
  completeLesson(s, "u02-l1", { accuracy: 100, perfect: true }, T0);
  assert.equal(nextLesson(s, units), null);
  assert.equal(s.lessons["u01-l1"].best, 80);
});

function sample(seed, now) {
  const s = newState(now);
  addXp(s, seed * 10, now);
  recordActivity(s, now);
  completeLesson(s, `u01-l${seed}`, { accuracy: 50 + seed, perfect: false }, now);
  recordAnswer(s, `u01-l1-q0${seed}`, false, "lesson", now);
  recordAnswer(s, "u01-l1-q09", seed % 2 === 0, "lesson", now + seed);
  return s;
}

test("merge is commutative (except settings) and keeps the best of both", () => {
  const a = sample(1, T0);
  const b = sample(2, T0 + DAY);
  a.settings.theme = "dark";
  const ab = mergeStates(a, b, T0 + 2 * DAY);
  const ba = mergeStates(b, a, T0 + 2 * DAY);
  const strip = (x) => ({ ...x, settings: null });
  assert.deepEqual(strip(ab), strip(ba));
  assert.equal(ab.settings.theme, "dark");
  assert.equal(ba.settings.theme, "auto");
  assert.equal(ab.xp, Math.max(a.xp, b.xp));
  assert.ok(ab.lessons["u01-l1"].done && ab.lessons["u01-l2"].done);
  assert.equal(ab.streak.lastDate, "2026-11-23");
  assert.ok(ab.questions["u01-l1-q01"] && ab.questions["u01-l1-q02"]);
  // newer record wins for the shared question (b answered it later, correctly)
  assert.equal(ab.questions["u01-l1-q09"].right, 1);
  assert.equal(summarize(ab).lessonsDone, 2);
  // merging with itself is idempotent
  assert.deepEqual(strip(mergeStates(ab, ab, T0)), strip(ab));
});

test("migrate tolerates junk", () => {
  const s = migrate({ xp: "12", hearts: { n: 99 }, extra: 1 }, T0);
  assert.equal(s.xp, 12);
  assert.equal(s.hearts.n, MAX_HEARTS);
  assert.ok(s.settings && s.lessons && s.questions);
  assert.equal(migrate("nope", T0).xp, 0);
});

test("sync code round-trip and corruption detection", async () => {
  const s = sample(3, T0);
  s.settings.theme = "dark";
  const code = await encodeState(s);
  assert.match(code, /^GQ1\.[0-9a-f]{8}\.[A-Za-z0-9_-]+$/);
  const back = await decodeState("  " + code.slice(0, 20) + "\n" + code.slice(20) + " ");
  assert.equal(back.xp, s.xp);
  assert.equal(back.settings, undefined, "settings are not exported");
  assert.deepEqual(back.lessons, s.lessons);
  await assert.rejects(decodeState("hello"), SyncCodeError);
  const parts = code.split(".");
  const badCrc = `GQ1.${parts[1] === "00000000" ? "11111111" : "00000000"}.${parts[2]}`;
  await assert.rejects(decodeState(badCrc), SyncCodeError);
  await assert.rejects(decodeState(code.slice(0, -6)), SyncCodeError);
  assert.equal(crc32(new TextEncoder().encode("123456789")), "cbf43926");
});

test("rich text markup tokenizer", () => {
  assert.deepEqual(tokenizeRich("a **b** __c__ ==d=="), [
    { t: "text", v: "a " }, { t: "b", v: "b" }, { t: "text", v: " " }, { t: "u", v: "c" }, { t: "text", v: " " }, { t: "m", v: "d" },
  ]);
  assert.equal(plain("the ___ of __x__"), "the ___ of x");
});

test("multi-part error questions", () => {
  const q = { type: "error", answer: [1, 3] };
  assert.ok(checkAnswer(q, [3, 1]).correct);
  assert.ok(!checkAnswer(q, [1]).correct);
  assert.ok(!checkAnswer(q, [1, 2, 3]).correct);
  assert.ok(!isComplete(q, []));
  assert.ok(isComplete(q, [2]));
});
