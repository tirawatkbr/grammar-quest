// Question renderers. Each returns a controller:
//   { el, getResponse(), isComplete(), showResult(result, response), selectByNumber(n), focusFirst() }
import { h, rich, splitBlanks, shuffle, LETTERS, plain } from "../util.js";
import { icon } from "./icon.js";
import { isComplete as complete } from "../check.js";

export const TYPE_INSTRUCTION = {
  mcq: "เลือกคำตอบที่ถูกต้อง",
  "choice-fill": "เลือกคำเติมในช่องว่าง",
  "type-fill": "พิมพ์คำตอบลงในช่องว่าง",
  error: "แตะส่วนที่ผิดไวยากรณ์",
  order: "เรียงคำให้เป็นประโยคที่ถูกต้อง",
};

/** Render a prompt that may contain {_} blanks. Returns {node, blanks:[span]} */
function promptWithBlanks(text, { numbered }) {
  const parts = splitBlanks(text);
  const p = h("p", { class: "prompt", lang: "en" });
  const blanks = [];
  parts.forEach((part, i) => {
    p.append(rich(part));
    if (i < parts.length - 1) {
      const b = h("span", { class: "blank", "aria-label": numbered ? `ช่องว่างที่ ${i + 1}` : "ช่องว่าง" }, " ");
      blanks.push(b);
      p.append(b);
      if (numbered) p.append(h("span", { class: "blank-num", "aria-hidden": "true" }, String(i + 1)));
    }
  });
  return { node: p, blanks };
}

function contextBlock(q) {
  if (!q.context) return null;
  return h("div", { class: "prompt prompt-context", lang: "en" }, rich(q.context));
}

/** Generic radio group with roving tabindex + arrow keys. */
function radioGroup(items, { label, onSelect, cls = "choices", itemFactory }) {
  const group = h("div", { class: cls, role: "radiogroup", "aria-label": label });
  const buttons = items.map((it, i) => {
    const btn = itemFactory(it, i);
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", "false");
    btn.setAttribute("tabindex", i === 0 ? "0" : "-1");
    btn.type = "button";
    btn.addEventListener("click", () => select(i));
    btn.addEventListener("keydown", (e) => {
      const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (dir) {
        e.preventDefault();
        const n = (i + dir + items.length) % items.length;
        select(n);
        buttons[n].focus();
      }
    });
    group.append(btn);
    return btn;
  });
  let selected = -1;
  function select(i) {
    if (buttons[i].disabled) return;
    selected = i;
    buttons.forEach((b, j) => {
      b.setAttribute("aria-checked", String(j === i));
      b.setAttribute("tabindex", j === i ? "0" : "-1");
    });
    onSelect(i);
  }
  return { group, buttons, select, get selected() { return selected; } };
}

function stateTag(kind) {
  return kind === "correct"
    ? h("span", { class: "choice-state" }, icon("check_circle", { fill: true, size: "sm" }), "คำตอบที่ถูก")
    : h("span", { class: "choice-state" }, icon("cancel", { fill: true, size: "sm" }), "คำตอบของคุณ");
}

// ---------------- mcq ----------------
function renderMcq(q, onChange) {
  let response = null;
  const { node } = promptWithBlanks(q.prompt, { numbered: false });
  const rg = radioGroup(q.choices, {
    label: "ตัวเลือก",
    onSelect: (i) => {
      response = LETTERS[i];
      onChange();
    },
    itemFactory: (c, i) =>
      h(
        "button",
        { class: "choice" },
        h("span", { class: "choice-key", "aria-hidden": "true" }, LETTERS[i]),
        h("span", { class: "choice-text", lang: "en" }, h("span", { class: "sr-only" }, `ตัวเลือก ${LETTERS[i]}: `), rich(c)),
      ),
  });
  const el = h("div", { class: "stack" }, contextBlock(q), node, rg.group);
  return {
    el,
    getResponse: () => response,
    selectByNumber: (n) => n >= 1 && n <= q.choices.length && rg.select(n - 1),
    focusFirst: () => rg.buttons[0].focus(),
    showResult(result) {
      const correctKeys = [q.answer, ...(q.alsoCorrect || [])];
      rg.buttons.forEach((b, i) => {
        b.disabled = true;
        const key = LETTERS[i];
        if (correctKeys.includes(key)) {
          b.classList.add("is-correct");
          b.append(stateTag("correct"));
        } else if (key === response) {
          b.classList.add("is-wrong");
          b.append(stateTag("wrong"));
        }
      });
    },
  };
}

// ---------------- choice-fill ----------------
function renderChoiceFill(q, onChange) {
  const n = q.answer.length;
  const response = new Array(n).fill(undefined);
  const { node, blanks } = promptWithBlanks(q.prompt, { numbered: n > 1 });
  const groups = [];
  const wrap = h("div", {});
  for (let b = 0; b < n; b++) {
    const opts = q.optionsPerBlank ? q.optionsPerBlank[b] : q.options;
    const labelText = n > 1 ? `ช่องที่ ${b + 1}` : "เลือกคำ";
    const labelId = `${q.id}-bl-${b}`;
    const rg = radioGroup(opts, {
      label: labelText,
      cls: "chips",
      onSelect: (i) => {
        response[b] = opts[i];
        blanks[b].textContent = opts[i] === "—" ? "—" : opts[i];
        onChange();
      },
      itemFactory: (o) => h("button", { class: "chip", lang: o === "—" ? undefined : "en" }, o === "—" ? "— (ไม่ต้องเติม)" : o),
    });
    groups.push({ rg, opts });
    wrap.append(
      h("div", { class: "blank-group" }, n > 1 ? h("p", { class: "blank-group-label", id: labelId }, labelText) : null, rg.group),
    );
  }
  const el = h("div", { class: "stack" }, contextBlock(q), node, wrap);
  return {
    el,
    getResponse: () => response.slice(),
    selectByNumber: (k) => {
      if (n !== 1) return;
      const g = groups[0];
      if (k >= 1 && k <= g.opts.length) g.rg.select(k - 1);
    },
    focusFirst: () => groups[0].rg.buttons[0].focus(),
    showResult(result) {
      groups.forEach(({ rg, opts }, b) => {
        const ok = [q.answer[b]].flat();
        rg.buttons.forEach((btn, i) => {
          btn.disabled = true;
          if (ok.includes(opts[i])) btn.classList.add("is-correct");
          else if (opts[i] === response[b]) btn.classList.add("is-wrong");
        });
        blanks[b].textContent = [q.answer[b]].flat()[0];
      });
    },
  };
}

// ---------------- type-fill ----------------
function renderTypeFill(q, onChange, onEnter) {
  const n = q.answer.length;
  const { node, blanks } = promptWithBlanks(q.prompt, { numbered: n > 1 });
  const inputs = [];
  const fields = h("div", {});
  for (let b = 0; b < n; b++) {
    const id = `${q.id}-in-${b}`;
    const input = h("input", {
      class: "input",
      id,
      type: "text",
      lang: "en",
      autocomplete: "off",
      autocapitalize: "off",
      autocorrect: "off",
      spellcheck: "false",
      enterkeyhint: "done",
    });
    input.addEventListener("input", () => {
      blanks[b].textContent = input.value.trim() || " ";
      onChange();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (b < n - 1 && !inputs[b + 1].value) inputs[b + 1].focus();
        else onEnter();
      }
    });
    inputs.push(input);
    const hint = q.hints?.[b];
    fields.append(
      h(
        "div",
        { class: "field" },
        h("label", { for: id }, n > 1 ? `ช่องที่ ${b + 1}` : "คำตอบ", hint ? h("span", { class: "muted", lang: "en" }, ` (${hint})`) : null),
        input,
      ),
    );
  }
  const el = h("div", { class: "stack" }, contextBlock(q), node, fields);
  return {
    el,
    getResponse: () => inputs.map((i) => i.value),
    selectByNumber: () => {},
    focusFirst: () => inputs[0].focus(),
    typing: true,
    showResult(result) {
      inputs.forEach((input, b) => {
        input.readOnly = true;
        input.classList.add(result.perBlank?.[b] ? "is-correct" : "is-wrong");
        input.setAttribute("aria-invalid", String(!result.perBlank?.[b]));
        if (!result.perBlank?.[b]) blanks[b].textContent = [q.answer[b]].flat()[0];
      });
    },
  };
}

// ---------------- error spotting ----------------
/** Parse "text [1|part] text [2|part]" → [{text}|{n, text}] */
export function parseSpots(s) {
  const out = [];
  const re = /\[(\d)\|([^\]]+)\]/g;
  let last = 0;
  let m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) });
    out.push({ n: Number(m[1]), text: m[2] });
    last = re.lastIndex;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}

function renderError(q, onChange) {
  let response = null;
  const segs = parseSpots(q.prompt);
  const spots = segs.filter((s) => s.n);
  const sentence = h("p", { class: "prompt spot-sentence", lang: "en", role: "radiogroup", "aria-label": "ส่วนที่ขีดเส้นใต้" });
  const buttons = [];
  let idx = 0;
  for (const s of segs) {
    if (!s.n) {
      sentence.append(rich(s.text));
      continue;
    }
    const i = idx++;
    const btn = h(
      "button",
      { class: "spot", type: "button", role: "radio", "aria-checked": "false", tabindex: i === 0 ? "0" : "-1" },
      h("span", { class: "spot-num" }, `(${s.n})`),
      s.text,
    );
    btn.addEventListener("click", () => select(i));
    btn.addEventListener("keydown", (e) => {
      const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (dir) {
        e.preventDefault();
        const n = (i + dir + spots.length) % spots.length;
        select(n);
        buttons[n].focus();
      }
    });
    buttons.push(btn);
    sentence.append(btn);
  }
  function select(i) {
    if (buttons[i].disabled) return;
    response = spots[i].n;
    buttons.forEach((b, j) => {
      b.setAttribute("aria-checked", String(j === i));
      b.setAttribute("tabindex", j === i ? "0" : "-1");
    });
    onChange();
  }
  const el = h("div", { class: "stack" }, contextBlock(q), sentence);
  return {
    el,
    getResponse: () => response,
    selectByNumber: (n) => {
      const i = spots.findIndex((s) => s.n === n);
      if (i >= 0) select(i);
    },
    focusFirst: () => buttons[0].focus(),
    showResult() {
      buttons.forEach((b, i) => {
        b.disabled = true;
        if (spots[i].n === Number(q.answer)) {
          b.classList.add("is-correct");
          b.append(h("span", { class: "sr-only" }, " (ส่วนที่ผิด — คำตอบที่ถูก)"));
        } else if (spots[i].n === response) {
          b.classList.add("is-wrong");
          b.append(h("span", { class: "sr-only" }, " (คำตอบของคุณ)"));
        }
      });
    },
  };
}

// ---------------- order (word bank) ----------------
function renderOrder(q, onChange) {
  const words = String(q.answer).trim().split(/\s+/);
  const pool = shuffle([...words, ...(q.distractors || [])].map((w, i) => ({ w, i })));
  const chosen = [];
  const answerBox = h("div", {
    class: "order-answer",
    "data-empty": "แตะคำด้านล่างเพื่อสร้างประโยค",
    "aria-label": "ประโยคของคุณ",
    role: "group",
    lang: "en",
  });
  const bank = h("div", { class: "chips", role: "group", "aria-label": "คลังคำ", lang: "en" });
  const live = h("p", { class: "sr-only", "aria-live": "polite" });
  const bankBtns = new Map();

  function renderAnswer() {
    answerBox.replaceChildren(
      ...chosen.map((item, pos) =>
        h(
          "button",
          {
            class: "chip",
            type: "button",
            "aria-label": `${item.w} (ตำแหน่ง ${pos + 1}, แตะเพื่อเอาออก)`,
            onclick: () => {
              chosen.splice(pos, 1);
              bankBtns.get(item.i).classList.remove("is-used");
              bankBtns.get(item.i).disabled = false;
              live.textContent = `เอาคำ ${item.w} ออก`;
              renderAnswer();
              onChange();
              (answerBox.querySelector("button") || bank.querySelector("button:not(:disabled)"))?.focus();
            },
          },
          item.w,
        ),
      ),
    );
  }
  for (const item of pool) {
    const btn = h("button", { class: "chip", type: "button" }, item.w);
    btn.addEventListener("click", () => {
      chosen.push(item);
      btn.classList.add("is-used");
      btn.disabled = true;
      live.textContent = `เพิ่มคำ ${item.w}`;
      renderAnswer();
      onChange();
      const next = [...bank.querySelectorAll("button:not(:disabled)")][0];
      next?.focus();
    });
    bankBtns.set(item.i, btn);
    bank.append(btn);
  }
  const el = h(
    "div",
    { class: "stack" },
    contextBlock(q),
    h("p", { class: "prompt", lang: "en" }, rich(q.prompt)),
    answerBox,
    bank,
    live,
  );
  return {
    el,
    getResponse: () => chosen.map((c) => c.w),
    selectByNumber: () => {},
    focusFirst: () => bank.querySelector("button")?.focus(),
    showResult(result) {
      answerBox.classList.add(result.correct ? "is-correct" : "is-wrong");
      answerBox.querySelectorAll("button").forEach((b) => (b.disabled = true));
      bank.querySelectorAll("button").forEach((b) => (b.disabled = true));
    },
  };
}

export function renderQuestion(q, { onChange, onEnter }) {
  let ctl;
  switch (q.type) {
    case "mcq":
      ctl = renderMcq(q, onChange);
      break;
    case "choice-fill":
      ctl = renderChoiceFill(q, onChange);
      break;
    case "type-fill":
      ctl = renderTypeFill(q, onChange, onEnter);
      break;
    case "error":
      ctl = renderError(q, onChange);
      break;
    case "order":
      ctl = renderOrder(q, onChange);
      break;
    default:
      throw new Error("Unknown type " + q.type);
  }
  ctl.isComplete = () => complete(q, ctl.getResponse());
  return ctl;
}

/** Human-readable correct answer (plain text) for the feedback panel. */
export function correctAnswerText(q) {
  switch (q.type) {
    case "mcq":
      return [q.answer, ...(q.alsoCorrect || [])].map((k) => `${k}. ${plain(q.choices[LETTERS.indexOf(k)])}`).join(" หรือ ");
    case "choice-fill":
      return q.answer.map((a, i) => (q.answer.length > 1 ? `(${i + 1}) ` : "") + [a].flat().join(" / ")).join("  ");
    case "type-fill":
      return q.answer.map((a, i) => (q.answer.length > 1 ? `(${i + 1}) ` : "") + [a].flat()[0]).join("  ");
    case "error": {
      const seg = parseSpots(q.prompt).find((s) => s.n === Number(q.answer));
      return `(${q.answer}) ${seg ? seg.text : ""} → ${q.correction}`;
    }
    case "order":
      return q.answer;
    default:
      return "";
  }
}

/** Plain text of a learner response (for results list). */
export function responseText(q, r) {
  switch (q.type) {
    case "mcq":
      return r ? `${r}. ${plain(q.choices[LETTERS.indexOf(r)])}` : "";
    case "choice-fill":
    case "type-fill":
      return (r || []).map((x, i) => ((r.length > 1 ? `(${i + 1}) ` : "") + (x ?? ""))).join("  ");
    case "error":
      return r ? `(${r})` : "";
    case "order":
      return (r || []).join(" ");
    default:
      return "";
  }
}
