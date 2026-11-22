// Question session runner shared by lessons, review and TOEIC Mix.
import { h, rich, LETTERS, plain, formatDuration } from "../util.js";
import { icon } from "../ui/icon.js";
import { renderQuestion, correctAnswerText, responseText, TYPE_INSTRUCTION, parseSpots } from "../ui/questions.js";
import { summaryCard, tipBox } from "../ui/summary.js";
import { announce, openDialog, confirmDialog, heartBadge, progressBar, mount, setTitle } from "../ui/common.js";
import { checkAnswer } from "../check.js";
import { getState, update } from "../store.js";
import { recordAnswer, loseHeart, gainHeart, addXp, XP, heartsNow, completeLesson, recordActivity, levelInfo } from "../game.js";
import { summaryFor } from "../data.js";

/**
 * opts: {
 *   mode: "lesson" | "review" | "mix",
 *   title: string, questions: Question[] (with unitId),
 *   lessonId?: string, exitHash: string,
 *   onFinishedNext?: {label, hash},      // primary action on results screen
 *   instruction?: string                  // lesson-level instruction (Thai)
 *   instructionEn?: string
 * }
 */
export function runSession(opts) {
  const { mode, questions } = opts;
  const total = questions.length;
  const queue = questions.map((q) => ({ q, retry: false }));
  const solved = new Set();
  const firstTry = new Map(); // id -> correct on first attempt
  const mistakes = new Map(); // id -> {q, response}
  let xpEarned = 0;
  let heartsLost = 0;
  let pos = 0;
  let checked = false;
  let ctl = null;
  let current = null;
  let ended = false;
  const startedAt = Date.now();
  const levelBefore = levelInfo(getState().xp).level;

  document.body.classList.add("focus-mode");
  setTitle(opts.title);

  // ---------- layout ----------
  const closeBtn = h("button", { class: "btn btn-ghost btn-icon", type: "button", "aria-label": "ออกจากบทเรียน" }, icon("close"));
  const progressHost = h("div", { style: { flex: "1" } });
  const heartHost = h("div", {});
  const timerHost = h("span", { class: "pill num", hidden: true });
  const counter = h("p", { class: "small muted num" });
  const qHost = h("div", { class: "stack" });
  const bar = h("div", { class: "action-bar" });
  const root = h(
    "div",
    { class: "stack" },
    h("div", { class: "lesson-top" }, closeBtn, progressHost, heartHost, timerHost),
    h("h1", { class: "sr-only" }, opts.title),
    counter,
    qHost,
    bar,
  );

  closeBtn.addEventListener("click", async () => {
    const ok = await confirmDialog(
      "ออกจากบทเรียนนี้?",
      "ความคืบหน้าในบทนี้จะไม่ถูกบันทึกว่าจบแล้ว แต่ XP และข้อที่ทำไปแล้วยังเก็บไว้",
      { ok: "ออก", cancel: "เรียนต่อ" },
    );
    if (ok) leave(opts.exitHash);
  });

  let timerId = null;
  if (mode === "mix" && getState().settings.mixTimer) {
    timerHost.hidden = false;
    const target = total * 30 * 1000;
    const tick = () => {
      const ms = Date.now() - startedAt;
      timerHost.textContent = `${formatDuration(ms)} / เป้า ${Math.round(target / 60000)} นาที`;
    };
    tick();
    timerId = setInterval(tick, 1000);
  }

  function leave(hash) {
    ended = true;
    cleanup();
    location.hash = hash;
  }

  function cleanup() {
    document.removeEventListener("keydown", onKey);
    if (timerId) clearInterval(timerId);
    document.body.classList.remove("focus-mode");
  }

  function renderTop() {
    progressHost.replaceChildren(progressBar(solved.size, total, "ความคืบหน้าในบทเรียน"));
    heartHost.replaceChildren(mode === "lesson" ? heartBadge(getState()) : h("span"));
    counter.textContent = `ข้อ ${Math.min(solved.size + 1, total)} จาก ${total}` + (current?.retry ? " · ทำซ้ำข้อที่ผิด" : "");
  }

  // ---------- question ----------
  function showQuestion() {
    checked = false;
    current = queue[pos];
    const q = current.q;
    renderTop();
    ctl = renderQuestion(q, { onChange: refreshCheck, onEnter: () => primary() });
    qHost.dataset.qid = q.id;
    const instr = q.instruction || opts.instruction || TYPE_INSTRUCTION[q.type];
    qHost.replaceChildren(
      h(
        "div",
        { class: "stack-sm" },
        h("p", { class: "instruction" }, instr),
        q.instructionEn || opts.instructionEn
          ? h("p", { class: "small muted", lang: "en" }, q.instructionEn || opts.instructionEn)
          : null,
        q.source === "toeic" ? h("span", { class: "pill pill-primary" }, "แนวข้อสอบ TOEIC") : null,
      ),
      ctl.el,
    );
    const checkBtn = h("button", { class: "btn btn-primary btn-block", type: "button", disabled: true, id: "check-btn" }, "ตรวจคำตอบ");
    checkBtn.addEventListener("click", doCheck);
    bar.className = "action-bar";
    bar.removeAttribute("role");
    bar.removeAttribute("aria-labelledby");
    bar.replaceChildren(checkBtn);
    if (ctl.typing) ctl.focusFirst();
    else {
      const qh = qHost.querySelector(".instruction");
      qh.setAttribute("tabindex", "-1");
      qh.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  }

  function refreshCheck() {
    const btn = document.getElementById("check-btn");
    if (btn) btn.disabled = !ctl.isComplete();
  }

  function doCheck() {
    if (checked || !ctl.isComplete()) return;
    checked = true;
    const q = current.q;
    const response = ctl.getResponse();
    const result = checkAnswer(q, response);
    ctl.showResult(result, response);

    let heartMsg = "";
    update((s) => {
      recordAnswer(s, q.id, result.correct, mode);
      if (result.correct) {
        let gain = 0;
        if (mode === "review") {
          gain = XP.review;
          const before = heartsNow(s).n;
          if (gainHeart(s) > before) heartMsg = " ได้หัวใจคืน 1 ดวง";
        } else gain = current.retry ? XP.corrected : XP.firstTry;
        addXp(s, gain);
        xpEarned += gain;
      } else if (mode === "lesson") {
        const before = heartsNow(s).n;
        const after = loseHeart(s);
        if (after < before) {
          heartsLost++;
          heartMsg = ` เสียหัวใจ 1 ดวง เหลือ ${after} ดวง`;
        }
      }
    });

    if (!current.retry) firstTry.set(q.id, result.correct);
    if (result.correct) solved.add(q.id);
    else {
      mistakes.set(q.id, { q, response });
      queue.push({ q, retry: true });
    }
    renderTop();
    showFeedback(q, response, result, heartMsg);
  }

  function whyWrongFor(q, response) {
    if (!q.whyWrong) return null;
    if (q.type === "mcq") return q.whyWrong[response] || null;
    if (q.type === "error") {
      if (!Array.isArray(response)) return q.whyWrong[String(response)] || null;
      const ans = q.answer.map(Number);
      const extra = response.filter((n) => !ans.includes(n) && q.whyWrong[String(n)]).map((n) => `(${n}) ${q.whyWrong[String(n)]}`);
      const missed = ans.filter((n) => !response.includes(n)).map((n) => `(${n}) ยังไม่ได้เลือก — ส่วนนี้ผิด`);
      return [...extra, ...missed].join("\n") || null;
    }
    if (q.type === "choice-fill") {
      const parts = (response || [])
        .map((r, i) => (q.whyWrong[r] && ![q.answer[i]].flat().includes(r) ? `${r}: ${q.whyWrong[r]}` : null))
        .filter(Boolean);
      return parts.length ? parts.join("\n") : null;
    }
    return null;
  }

  function showFeedback(q, response, result, heartMsg) {
    const titleId = "fb-title";
    const ok = result.correct;
    const why = ok ? null : whyWrongFor(q, response);
    const sumBtn = h("button", { class: "btn btn-secondary", type: "button" }, icon("menu_book", { size: "sm" }), "ดูสรุปกฎ");
    sumBtn.addEventListener("click", () => openSummary(q));
    const nextBtn = h("button", { class: "btn " + (ok ? "btn-success" : "btn-danger"), type: "button", style: { flex: "1" } }, "ต่อไป", icon("arrow_forward", { size: "sm" }));
    nextBtn.addEventListener("click", next);

    bar.className = "action-bar feedback " + (ok ? "is-correct" : "is-wrong");
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-labelledby", titleId);
    bar.replaceChildren(
      h(
        "div",
        { class: "stack-sm" },
        h(
          "h2",
          { class: "feedback-title", id: titleId, tabindex: "-1" },
          icon(ok ? "check_circle" : "cancel", { fill: true }),
          ok ? "ถูกต้อง!" : "ยังไม่ถูก",
        ),
        !ok || q.type !== "mcq"
          ? h("p", {}, h("span", { class: "muted" }, "คำตอบที่ถูก: "), h("span", { class: "feedback-answer", lang: "en" }, correctAnswerText(q)))
          : null,
        q.type === "order" && q.accept?.length
          ? h("p", { class: "small" }, h("span", { class: "muted" }, "เขียนแบบอื่นที่ถูกเช่นกัน: "), h("span", { lang: "en" }, q.accept.join(" / ")))
          : null,
        h("div", {}, h("p", { class: "explain-label" }, "เหตุผล"), h("p", { class: "explain" }, rich(q.explain))),
        why ? h("div", {}, h("p", { class: "explain-label" }, "ทำไมคำตอบที่เลือกจึงผิด"), h("p", { class: "explain" }, rich(why))) : null,
        q.tip ? tipBox(q.tip) : null,
        h("div", { class: "row", style: { flexWrap: "wrap", marginTop: "8px" } }, sumBtn, nextBtn),
      ),
    );
    announce((ok ? "ถูกต้อง" : "ยังไม่ถูก คำตอบที่ถูกคือ " + correctAnswerText(q)) + "." + heartMsg);
    bar.querySelector("#" + titleId).focus({ preventScroll: true });
    bar.scrollIntoView({ block: "end", behavior: "smooth" });
  }

  async function openSummary(q) {
    const { unit, card } = await summaryFor(q);
    if (!card) return;
    await openDialog({
      title: `สรุปกฎ — ${unit.titleTh}`,
      content: summaryCard(card, { headingLevel: 3 }),
      wide: true,
      actions: [{ label: "กลับไปทำข้อสอบ", value: null, variant: "primary" }],
    });
  }

  async function next() {
    if (mode === "lesson" && !getState().settings.unlimitedHearts && heartsNow(getState()).n <= 0) {
      await outOfHearts();
      return;
    }
    pos++;
    if (pos >= queue.length) finish();
    else showQuestion();
  }

  async function outOfHearts() {
    const v = await openDialog({
      title: "หัวใจหมดแล้ว",
      content: h(
        "div",
        { class: "stack-sm" },
        h("p", {}, "หัวใจจะฟื้นเอง 1 ดวงทุก 30 นาที"),
        h("p", {}, "หรือไปที่ ทบทวน แล้วตอบข้อที่เคยผิดให้ถูก — ได้หัวใจคืนข้อละ 1 ดวง"),
        h("p", { class: "small muted" }, "ถ้าต้องการฝึกโดยไม่ใช้หัวใจ เปิด “โหมดฝึกไม่จำกัดหัวใจ” ได้ในหน้าตั้งค่า"),
      ),
      actions: [
        { label: "ออก", value: "exit", variant: "secondary" },
        { label: "ไปทบทวน", value: "review", variant: "primary" },
      ],
    });
    leave(v === "review" ? "#/review" : opts.exitHash);
  }

  function finish() {
    const ms = Date.now() - startedAt;
    const firstOk = [...firstTry.values()].filter(Boolean).length;
    const accuracy = total ? Math.round((firstOk / total) * 100) : 0;
    const perfect = mistakes.size === 0;
    update((s) => {
      if (mode === "lesson") {
        const before = s.xp;
        completeLesson(s, opts.lessonId, { accuracy, perfect });
        xpEarned += s.xp - before;
      } else if (mode === "mix") {
        addXp(s, XP.mixComplete);
        xpEarned += XP.mixComplete;
        recordActivity(s);
      } else recordActivity(s);
    });
    cleanup();
    ended = true;
    renderResults({ ms, accuracy, perfect, firstOk });
  }

  function renderResults({ ms, accuracy, perfect, firstOk }) {
    const s = getState();
    const levelAfter = levelInfo(s.xp).level;
    setTitle("ผลการเรียน — " + opts.title);
    const list = [...mistakes.values()].map(({ q, response }) =>
      h(
        "details",
        { class: "mistake" },
        h("summary", { lang: "en" }, plain(q.type === "error" ? parseSpots(q.prompt).map((x) => x.text).join("") : q.prompt).replace(/\{_\}/g, "____")),
        h(
          "div",
          { class: "stack-sm" },
          h("p", {}, h("span", { class: "muted" }, "คุณตอบ: "), h("span", { lang: "en" }, responseText(q, response))),
          h("p", {}, h("span", { class: "muted" }, "คำตอบที่ถูก: "), h("strong", { lang: "en" }, correctAnswerText(q))),
          h("p", { class: "explain" }, rich(q.explain)),
        ),
      ),
    );
    const primaryNext = opts.onFinishedNext || { label: "กลับหน้าหลัก", hash: "#/" };
    const node = h(
      "div",
      { class: "stack-lg" },
      h(
        "div",
        { class: "center stack-sm" },
        icon(perfect ? "emoji_events" : "task_alt", { fill: perfect, cls: "big-icon" }),
        h("h1", {}, mode === "review" ? "ทบทวนเสร็จแล้ว" : perfect ? "ยอดเยี่ยม! ไม่ผิดเลย" : "จบบทเรียนแล้ว"),
        h("p", { class: "muted" }, opts.title),
        levelAfter > levelBefore ? h("p", { class: "pill pill-primary" }, `เลเวลอัปเป็น Lv ${levelAfter}!`) : null,
      ),
      h(
        "div",
        { class: "card stat-grid" },
        stat(`+${xpEarned}`, "XP ที่ได้"),
        stat(`${accuracy}%`, `ถูกตั้งแต่ครั้งแรก (${firstOk}/${total})`),
        stat(formatDuration(ms), "เวลาที่ใช้"),
        stat(mode === "lesson" ? String(heartsLost) : String(mistakes.size), mode === "lesson" ? "หัวใจที่เสีย" : "ข้อที่ผิด"),
      ),
      mistakes.size
        ? h("section", { class: "stack-sm" }, h("h2", {}, `ข้อที่ผิด (${mistakes.size} ข้อ) — เก็บไว้ในทบทวนแล้ว`), ...list)
        : null,
      h(
        "div",
        { class: "stack-sm" },
        h("a", { class: "btn btn-primary btn-block", href: primaryNext.hash }, primaryNext.label),
        mode === "lesson" ? h("a", { class: "btn btn-secondary btn-block", href: opts.exitHash }, "กลับไปหน้าบทเรียน") : null,
      ),
    );
    mount(node);
    announce(`จบแล้ว ได้ ${xpEarned} XP ถูกตั้งแต่ครั้งแรก ${accuracy} เปอร์เซ็นต์`);
  }

  function stat(v, label) {
    return h("div", { class: "stat" }, h("span", { class: "stat-value" }, v), h("span", { class: "stat-label" }, label));
  }

  function primary() {
    if (ended) return;
    if (!checked) doCheck();
    else next();
  }

  function onKey(e) {
    if (ended || document.querySelector("dialog[open]")) return;
    const t = e.target;
    const inInput = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
    if (e.key === "Enter" && !inInput && !e.isComposing) {
      if (t.closest && t.closest(".lesson-top")) return; // close button keeps native Enter
      if (t.tagName === "A" || (t.tagName === "BUTTON" && !t.getAttribute("role") && t.id !== "check-btn" && !t.closest(".order-answer, .chips"))) {
        return; // native button activation (e.g. "ต่อไป", "ดูสรุปกฎ")
      }
      if (t.closest && t.closest(".order-answer, .chips") && !t.getAttribute("role")) return; // order chips use Enter to move
      e.preventDefault();
      primary();
      return;
    }
    if (!inInput && !checked && /^[1-9]$/.test(e.key) && !e.altKey && !e.ctrlKey && !e.metaKey) {
      ctl?.selectByNumber(Number(e.key));
    }
  }
  document.addEventListener("keydown", onKey);

  mount(root, { focus: false });
  const handle = {
    dispose() {
      if (!ended) {
        ended = true;
        cleanup();
      }
    },
  };
  if (!total) {
    leave(opts.exitHash);
    return handle;
  }
  showQuestion();
  return handle;
}
