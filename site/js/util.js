// Small DOM + text helpers. No innerHTML with data: all content goes through text nodes.

/**
 * Create an element. attrs: plain attributes, plus special keys:
 *  - class, text, on{Event} (function), dataset (object), style (object)
 * children: string | Node | array (falsy entries skipped)
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k === "style") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of [children].flat(Infinity)) {
    if (c === null || c === undefined || c === false || c === "") continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/**
 * Tokenise light markup used in content files:
 *   **bold**   __underline__   ==highlight==
 * Returns array of {t: "text"|"b"|"u"|"m", v: string}.
 */
export function tokenizeRich(text) {
  const out = [];
  const re = /\*\*(.+?)\*\*|(?<!_)__(?!_)(.+?)(?<!_)__(?!_)|==(.+?)==/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: "text", v: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: "b", v: m[1] });
    else if (m[2] !== undefined) out.push({ t: "u", v: m[2] });
    else out.push({ t: "m", v: m[3] });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

/** Plain text (markup removed) — for screen-reader labels and comparisons. */
export function plain(text) {
  return tokenizeRich(String(text ?? "")).map((t) => t.v).join("");
}

/** Render light markup to a fragment. */
export function rich(text) {
  const frag = document.createDocumentFragment();
  for (const tok of tokenizeRich(String(text ?? ""))) {
    if (tok.t === "text") frag.append(document.createTextNode(tok.v));
    else if (tok.t === "b") frag.append(h("strong", {}, tok.v));
    else if (tok.t === "u") frag.append(h("u", {}, tok.v));
    else frag.append(h("mark", {}, tok.v));
  }
  return frag;
}

/** Split a prompt on blank markers {_}. Returns array of strings (length = blanks + 1). */
export function splitBlanks(prompt) {
  return String(prompt).split("{_}");
}

export function countBlanks(prompt) {
  return splitBlanks(prompt).length - 1;
}

// ---------- dates (Asia/Bangkok calendar days) ----------
const DAY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD in Bangkok time for a timestamp (ms). */
export function dayKey(ts = Date.now()) {
  return DAY_FMT.format(new Date(ts));
}

/** Add n days to a YYYY-MM-DD key. */
export function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a) for YYYY-MM-DD keys. */
export function daysBetween(a, b) {
  const pa = a.split("-").map(Number);
  const pb = b.split("-").map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
}

// ---------- misc ----------
export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const LETTERS = ["a", "b", "c", "d", "e", "f"];

export function thaiNumber(n) {
  return new Intl.NumberFormat("th-TH").format(n);
}

export function formatDuration(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m} นาที ${r} วินาที` : `${r} วินาที`;
}
