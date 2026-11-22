// Entry points that start sessions: lesson, review, TOEIC mix.
import { h, shuffle } from "../util.js";
import { icon } from "../ui/icon.js";
import { mount, setTitle, openDialog } from "../ui/common.js";
import { getState, tickHearts } from "../store.js";
import { getUnits, loadUnit, locateLesson, loadQuestions } from "../data.js";
import { isLessonUnlocked, canStartLesson, reviewDue, reviewAll, isUnitUnlocked, heartsNow } from "../game.js";
import { runSession } from "./session.js";

export async function startLesson(lessonId) {
  const loc = locateLesson(lessonId);
  if (!loc) {
    location.hash = "#/";
    return null;
  }
  const units = getUnits();
  const meta = units[loc.unitIndex];
  const unitHash = `#/unit/${meta.id}`;
  tickHearts();
  const s = getState();
  if (!isLessonUnlocked(s, units, loc.unitIndex, loc.lessonIndex)) {
    location.hash = unitHash;
    return null;
  }
  if (!canStartLesson(s)) {
    const mins = Math.ceil(heartsNow(s).nextInMs / 60000);
    setTitle("หัวใจหมด");
    mount(
      h(
        "div",
        { class: "empty stack" },
        icon("favorite"),
        h("h1", {}, "หัวใจหมดแล้ว"),
        h("p", {}, `หัวใจดวงถัดไปจะกลับมาในอีกประมาณ ${mins} นาที`),
        h("p", {}, "ทบทวนข้อที่เคยผิดให้ถูก ได้หัวใจคืนข้อละ 1 ดวง"),
        h("a", { class: "btn btn-primary", href: "#/review" }, "ไปทบทวน"),
        h("a", { class: "btn btn-secondary", href: unitHash }, "กลับ"),
      ),
    );
    return null;
  }
  const unit = await loadUnit(meta.id);
  const lesson = unit.lessons[loc.lessonIndex];
  const questions = lesson.questions.map((q) => ({ ...q, unitId: unit.id, lessonId: lesson.id }));
  // what comes after this lesson?
  let nextHash = unitHash;
  let nextLabel = "กลับไปหน้าบท";
  if (loc.lessonIndex + 1 < unit.lessons.length) {
    nextHash = `#/lesson/${unit.lessons[loc.lessonIndex + 1].id}`;
    nextLabel = "บทเรียนถัดไป";
  } else if (loc.unitIndex + 1 < units.length) {
    nextHash = `#/unit/${units[loc.unitIndex + 1].id}`;
    nextLabel = "ไปบทถัดไป";
  }
  return runSession({
    mode: "lesson",
    title: `${unit.titleTh} · ${lesson.title}`,
    questions: lesson.shuffle ? shuffle(questions) : questions,
    lessonId: lesson.id,
    exitHash: unitHash,
    instruction: lesson.instruction,
    instructionEn: lesson.instructionEn,
    onFinishedNext: { label: nextLabel, hash: nextHash },
  });
}

export async function renderReview() {
  tickHearts();
  const s = getState();
  setTitle("ทบทวน");
  const due = reviewDue(s);
  const all = reviewAll(s);
  const content = h("div", { class: "stack-lg" }, h("h1", {}, "ทบทวนข้อที่เคยผิด"));
  if (!all.length) {
    content.append(
      h(
        "div",
        { class: "card empty" },
        icon("task_alt"),
        h("p", {}, "ยังไม่มีข้อที่ต้องทบทวน"),
        h("p", { class: "small" }, "ข้อที่ตอบผิดในบทเรียนจะถูกเก็บไว้ที่นี่ แล้วชวนกลับมาทำซ้ำแบบเว้นระยะ 1 และ 3 วัน จนจำได้"),
        h("a", { class: "btn btn-primary", href: "#/" }, "ไปเรียน"),
      ),
    );
  } else {
    const boxCount = [1, 2, 3].map((b) => Object.values(s.questions).filter((r) => r.box === b).length);
    content.append(
      h(
        "section",
        { class: "card stack-sm" },
        h("p", { class: "unit-title" }, due.length ? `ถึงเวลาทบทวน ${due.length} ข้อ` : "วันนี้ทบทวนครบแล้ว"),
        h("p", { class: "small muted" }, `ในคลังทั้งหมด ${all.length} ข้อ — กล่อง 1: ${boxCount[0]} · กล่อง 2: ${boxCount[1]} · กล่อง 3: ${boxCount[2]}`),
        h("p", { class: "small muted" }, "ตอบถูกแล้วข้อจะเลื่อนกล่อง (ทบทวนอีกครั้งใน 1 วัน แล้ว 3 วัน) ตอบถูกในกล่อง 3 ถือว่าจำได้แล้ว · ตอบถูกได้หัวใจคืน 1 ดวง"),
        h(
          "a",
          { class: "btn btn-primary btn-block", href: "#/review/due", "aria-disabled": due.length ? undefined : "true", hidden: !due.length },
          icon("play_arrow", { size: "sm" }),
          `เริ่มทบทวน (${Math.min(due.length, 15)} ข้อ)`,
        ),
        h("a", { class: "btn btn-secondary btn-block", href: "#/review/all" }, `ฝึกข้อที่เคยผิดทั้งหมด (สุ่ม ${Math.min(all.length, 15)} ข้อ)`),
      ),
    );
  }
  content.append(
    h(
      "a",
      { class: "card card-link row-between", href: "#/mix" },
      h("span", { class: "stack-sm" }, h("span", { class: "unit-title row" }, icon("shuffle"), "TOEIC Mix"), h("span", { class: "small muted", style: { display: "block" } }, "สุ่มข้อแนว TOEIC Part 5/6 จากบทที่ปลดล็อกแล้ว 20 ข้อ (ไม่ใช้หัวใจ)")),
      icon("chevron_right"),
    ),
  );
  mount(content);
}

export async function startReview(kind) {
  const s = getState();
  const ids = kind === "due" ? reviewDue(s) : reviewAll(s);
  const pick = shuffle(ids).slice(0, 15);
  const questions = await loadQuestions(pick);
  if (!questions.length) {
    location.hash = "#/review";
    return null;
  }
  return runSession({
    mode: "review",
    title: kind === "due" ? "ทบทวนข้อที่ถึงกำหนด" : "ฝึกข้อที่เคยผิด",
    questions,
    exitHash: "#/review",
    onFinishedNext: { label: "กลับหน้าทบทวน", hash: "#/review" },
  });
}

export async function startMix() {
  const s = getState();
  const units = getUnits();
  const open = units.filter((_, i) => isUnitUnlocked(s, units, i));
  const loaded = await Promise.all(open.map((u) => loadUnit(u.id)));
  const pool = [];
  for (const unit of loaded)
    for (const lesson of unit.lessons)
      for (const q of lesson.questions) if (q.source === "toeic" && !q.context) pool.push({ ...q, unitId: unit.id, lessonId: lesson.id });
  const questions = shuffle(pool).slice(0, 20);
  if (!questions.length) {
    await openDialog({ title: "ยังไม่มีข้อ TOEIC", content: "ปลดล็อกบทเรียนก่อน แล้วกลับมาฝึกโหมดนี้" });
    location.hash = "#/review";
    return null;
  }
  return runSession({
    mode: "mix",
    title: "TOEIC Mix",
    questions,
    exitHash: "#/review",
    onFinishedNext: { label: "ฝึกอีกชุด", hash: "#/mix?again=" + Date.now() },
  });
}
