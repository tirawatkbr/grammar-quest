// Content validator. Exit code 1 on any error.
// Usage: node scripts/validate.mjs [--words <path to word list>]
import fs from "node:fs";
import path from "node:path";
import { loadUnits, root, splitBlanks, parseSpots, UNIT_ORDER } from "./lib.mjs";

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const LETTERS = ["a", "b", "c", "d", "e", "f"];
const THAI = /[\u0E00-\u0E7F]/;
const plain = (s) => String(s ?? "").replace(/\*\*|(?<!_)__(?!_)|==/g, "");

// ---------- text hygiene ----------
const THAI_COMBINING = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;
const THAI_BASE = /[\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46]/;
function checkText(where, s) {
  if (typeof s !== "string") return;
  if (s.includes("\uFFFD")) err(where, "contains U+FFFD replacement character");
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(s)) err(where, "contains control character");
  if (/[^\S\n]{2,}/.test(s)) err(where, `double space: "${s.match(/.{0,15}[^\S\n]{2,}.{0,15}/)?.[0]}"`);
  if (/^\s|\s$/.test(s)) err(where, "leading/trailing whitespace");
  if (/\s[,.;:!?](?![\d.])/.test(s.replace(/\.\.\.|…/g, "")) && !/\{_\}\s*[,.;:!?]/.test(s)) {
    const m = s.match(/.{0,12}\s[,.;:!?].{0,6}/);
    if (m && !/\{_\}\s[,.;:!?]/.test(m[0]) && !/—\s[,.]/.test(m[0])) err(where, `space before punctuation: "${m[0]}"`);
  }
  // balanced pairs
  const noMarkers = s.replace(/(^|\n)\s*\d{1,2}\)/g, "$1"); // list markers like "1)" at line start
  for (const [o, c] of [["(", ")"], ["[", "]"], ["“", "”"]]) {
    const a = noMarkers.split(o).length - 1;
    const b = noMarkers.split(c).length - 1;
    if (a !== b) err(where, `unbalanced ${o}${c} (${a} vs ${b})`);
  }
  for (const mk of ["**", "=="]) if ((s.split(mk).length - 1) % 2) err(where, `unbalanced markup ${mk}`);
  if (((s.match(/(?<!_)__(?!_)/g) || []).length) % 2) err(where, "unbalanced markup __");
  if ((s.split('"').length - 1) % 2) err(where, 'unbalanced " quotes');
  // Thai combining marks must follow a Thai base or another mark
  for (let i = 0; i < s.length; i++) {
    if (THAI_COMBINING.test(s[i])) {
      const prev = s[i - 1] || "";
      if (!(THAI_BASE.test(prev) || THAI_COMBINING.test(prev))) {
        err(where, `floating Thai mark U+${s.charCodeAt(i).toString(16).toUpperCase()} at ${i}: "${s.slice(Math.max(0, i - 8), i + 4)}"`);
        break;
      }
    }
  }
  // Common Thai typing errors: sara am written as nikhahit + sara aa; doubled vowels
  if (/\u0E4D\u0E32/.test(s)) err(where, "ำ typed as ํ + า");
  if (/([\u0E31\u0E34-\u0E3A\u0E47-\u0E4E])\1/.test(s)) err(where, "doubled Thai vowel/tone mark");
  if (/\u0E40\u0E40/.test(s)) err(where, "เเ typed as two เ (use แ)");
}

function walkStrings(obj, where, fn) {
  if (typeof obj === "string") fn(where, obj);
  else if (Array.isArray(obj)) obj.forEach((v, i) => walkStrings(v, `${where}[${i}]`, fn));
  else if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) walkStrings(v, `${where}.${k}`, fn);
}

// ---------- English words ----------
const wordsArg = process.argv.indexOf("--words");
const wordFile = wordsArg > 0 ? process.argv[wordsArg + 1] : "C:/Users/trw_k/gq-tools/words_alpha.txt";
let dict = null;
if (fs.existsSync(wordFile)) {
  dict = new Set(fs.readFileSync(wordFile, "utf8").split(/\r?\n/).map((w) => w.trim().toLowerCase()));
  const allow = path.join(root, "scripts/allow-words.txt");
  if (fs.existsSync(allow))
    for (const w of fs.readFileSync(allow, "utf8").split(/\r?\n/)) if (w.trim() && !w.startsWith("#")) dict.add(w.trim().toLowerCase());
} else warn("words", `word list not found (${wordFile}) — English spell check skipped`);

const unknownWords = new Map();
function checkEnglish(where, s) {
  if (!dict || typeof s !== "string") return;
  for (const raw of plain(s).match(/[A-Za-z][A-Za-z'’-]*/g) || []) {
    for (const part of raw.split(/[-]/)) {
      let w = part.replace(/[’]/g, "'").replace(/^'+|'+$/g, "");
      if (!w) continue;
      const lw = w.toLowerCase();
      const base = lw.replace(/n't$/, "").replace(/'(s|d|ll|re|ve|m)$/, "").replace(/s'$/, "s");
      const candidates = [lw, base, base.replace(/'/g, "")];
      if (candidates.some((c) => dict.has(c))) continue;
      if (/^[A-Z]/.test(w) && w.length > 1) {
        // proper nouns: accept capitalised words but report once for review
        if (!unknownWords.has(w)) unknownWords.set(w, where);
        continue;
      }
      if (lw.length === 1) continue;
      err(where, `unknown English word "${w}"`);
    }
  }
}

// ---------- structure ----------
const units = await loadUnits();
if (!units.length) err("data", "no unit files");
const allQ = new Set();
const stats = [];

for (const { file, unit } of units) {
  const U = unit.id;
  const expectedChapter = UNIT_ORDER.find(([id]) => id === U)?.[1];
  if (file !== `${U}.js`) err(U, `file name ${file} does not match id`);
  if (unit.chapter !== expectedChapter) err(U, `chapter ${unit.chapter} != expected ${expectedChapter}`);
  for (const k of ["title", "titleTh"]) if (!unit[k]) err(U, `missing ${k}`);
  if (!Array.isArray(unit.summary) || unit.summary.length < 3) err(U, "summary needs ≥3 cards");
  unit.summary?.forEach((c, i) => {
    const w = `${U}.summary[${i}]`;
    if (!c.title) err(w, "missing title");
    if (!c.body && !c.table && !c.examples?.length) err(w, "empty card");
    if (c.table) {
      const n = c.table.head.length;
      c.table.rows.forEach((r, j) => r.length !== n && err(w, `table row ${j} has ${r.length} cells, head has ${n}`));
    }
    c.examples?.forEach((ex, j) => !ex.en && err(w, `example ${j} missing en`));
  });
  if (!unit.lessons?.length) err(U, "no lessons");

  // inventory
  const invFile = path.join(root, `scripts/inventory/${U}.json`);
  const inv = fs.existsSync(invFile) ? JSON.parse(fs.readFileSync(invFile, "utf8")) : null;
  if (!inv) err(U, `missing inventory scripts/inventory/${U}.json`);
  const refCount = new Map(); // "Ex.1" -> Set(numbers)

  let qn = 0;
  let toeic = 0;
  unit.lessons.forEach((l, li) => {
    const L = l.id;
    if (L !== `${U}-l${li + 1}`) err(L, `lesson id should be ${U}-l${li + 1}`);
    if (!l.title) err(L, "missing title");
    if (!["sheet", "toeic"].includes(l.kind)) err(L, "kind must be sheet|toeic");
    if (!l.questions?.length) err(L, "no questions");
    if (l.questions.length > 15) warn(L, `${l.questions.length} questions (>15) — consider splitting`);
    l.questions.forEach((q, qi) => {
      const Q = q.id || `${L}#${qi}`;
      qn++;
      if (q.id !== `${L}-q${String(qi + 1).padStart(2, "0")}`) err(Q, `id should be ${L}-q${String(qi + 1).padStart(2, "0")}`);
      if (allQ.has(q.id)) err(Q, "duplicate id");
      allQ.add(q.id);
      if (!["sheet", "toeic"].includes(q.source)) err(Q, "source must be sheet|toeic");
      if (q.source === "toeic") toeic++;
      if (q.source === "sheet") {
        const m = /^Ex\.(\w+) #(\d+)$/.exec(q.ref || "");
        if (!m) err(Q, `sheet question needs ref "Ex.N #k", got "${q.ref}"`);
        else {
          if (!refCount.has(m[1])) refCount.set(m[1], []);
          refCount.get(m[1]).push(Number(m[2]));
        }
      }
      if (typeof q.explain !== "string" || plain(q.explain).length < 40) err(Q, "explain missing or < 40 chars");
      else if (!THAI.test(q.explain)) err(Q, "explain must be Thai");
      if (!Number.isInteger(q.summaryRef) || q.summaryRef < 0 || q.summaryRef >= unit.summary.length) err(Q, `summaryRef ${q.summaryRef} invalid`);
      if (!q.prompt) err(Q, "missing prompt");
      const blanks = splitBlanks(q.prompt || "").length - 1;
      switch (q.type) {
        case "mcq": {
          if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 5) err(Q, "mcq needs 2–5 choices");
          const keys = LETTERS.slice(0, q.choices?.length || 0);
          if (!keys.includes(q.answer)) err(Q, `answer "${q.answer}" not a valid letter`);
          const norm = (q.choices || []).map((c) => plain(c).trim().toLowerCase());
          if (new Set(norm).size !== norm.length) err(Q, "duplicate choices");
          const okKeys = [q.answer, ...(q.alsoCorrect || [])];
          for (const k of keys) {
            if (okKeys.includes(k)) continue;
            if (!q.whyWrong?.[k] || plain(q.whyWrong[k]).length < 20) err(Q, `whyWrong.${k} missing/short (<20)`);
          }
          for (const k of Object.keys(q.whyWrong || {})) if (!keys.includes(k) || okKeys.includes(k)) err(Q, `whyWrong.${k} not a wrong choice`);
          if (blanks > 1) err(Q, "mcq prompt has more than one blank");
          break;
        }
        case "choice-fill": {
          if (!Array.isArray(q.answer) || q.answer.length !== blanks) err(Q, `answer length ${q.answer?.length} != blanks ${blanks}`);
          (q.answer || []).forEach((a, i) => {
            const opts = q.optionsPerBlank ? q.optionsPerBlank[i] : q.options;
            if (!opts?.length) err(Q, `no options for blank ${i + 1}`);
            for (const x of [a].flat()) if (!opts?.includes(x)) err(Q, `answer "${x}" not in options (blank ${i + 1})`);
            if (opts && new Set(opts).size !== opts.length) err(Q, "duplicate options");
          });
          break;
        }
        case "type-fill": {
          if (!Array.isArray(q.answer) || q.answer.length !== blanks) err(Q, `answer length ${q.answer?.length} != blanks ${blanks}`);
          (q.answer || []).forEach((a, i) => {
            if (![a].flat().every((x) => typeof x === "string" && x.trim())) err(Q, `empty answer for blank ${i + 1}`);
          });
          if (q.hints && q.hints.length !== blanks) err(Q, "hints length != blanks");
          break;
        }
        case "error": {
          const spots = parseSpots(q.prompt).filter((s) => s.n);
          const nums = spots.map((s) => s.n);
          const multi = Array.isArray(q.answer);
          const ans = [q.answer].flat().map(Number);
          if (spots.length < (multi ? 1 : 2)) err(Q, "error question needs ≥2 parts (or multi)");
          nums.forEach((n, i) => n !== i + 1 && err(Q, `parts must be numbered 1..k in order (got ${nums.join(",")})`));
          for (const a of ans) if (!nums.includes(a)) err(Q, `answer ${a} not a part`);
          if (new Set(ans).size !== ans.length || !ans.length) err(Q, "answer parts must be unique and non-empty");
          if (!q.correction || (multi && (!Array.isArray(q.correction) || q.correction.length !== ans.length))) err(Q, "missing correction (multi: one per answer part)");
          if (blanks) err(Q, "error prompt must not contain {_}");
          for (const k of Object.keys(q.whyWrong || {})) if (!nums.includes(Number(k)) || ans.includes(Number(k))) err(Q, `whyWrong.${k} invalid`);
          break;
        }
        case "order": {
          if (typeof q.answer !== "string" || q.answer.trim().split(/\s+/).length < 3) err(Q, "order answer too short");
          for (const a of q.accept || []) {
            const t1 = a.trim().split(/\s+/).sort().join(" ");
            const t2 = [...q.answer.trim().split(/\s+/), ...(q.distractors || [])];
            // every accepted variant must be buildable from the chips
            const pool = [...t2];
            for (const w of a.trim().split(/\s+/)) {
              const i = pool.indexOf(w);
              if (i < 0) {
                err(Q, `accept variant uses "${w}" which is not a chip`);
                break;
              }
              pool.splice(i, 1);
            }
            if (t1 === q.answer.trim().split(/\s+/).sort().join(" ") && a.trim() === q.answer.trim()) err(Q, "accept duplicates answer");
          }
          break;
        }
        default:
          err(Q, `unknown type ${q.type}`);
      }
      // text checks
      walkStrings(q, Q, checkText);
      for (const k of ["context", "options", "correction", "accept"]) {
        walkStrings(q[k], `${Q}.${k}`, checkEnglish);
      }
      // error questions: the parts that ARE the errors may be deliberately misspelled ("sheeps")
      const promptForSpell =
        q.type === "error"
          ? String(q.prompt).replace(/\[(\d)\|([^\]]+)\]/g, (m, n, t) => ([q.answer].flat().map(Number).includes(Number(n)) ? " " : t))
          : q.prompt;
      checkEnglish(`${Q}.prompt`, promptForSpell);
      // wrong choices may be deliberately misspelled (e.g. "informations"); spell-check the correct ones only
      if (q.type === "mcq") for (const k of [q.answer, ...(q.alsoCorrect || [])]) checkEnglish(`${Q}.choices.${k}`, q.choices?.[LETTERS.indexOf(k)]);
      walkStrings(q.answer, `${Q}.answer`, (w, s) => (q.type === "mcq" || q.type === "error" ? null : checkEnglish(w, s)));
    });
  });
  walkStrings(unit.summary, `${U}.summary`, checkText);
  unit.summary.forEach((c, i) => c.examples?.forEach((ex, j) => checkEnglish(`${U}.summary[${i}].examples[${j}]`, ex.en)));
  for (const k of ["title", "titleTh", "intro"]) checkText(`${U}.${k}`, unit[k]);

  // inventory comparison
  if (inv) {
    for (const ex of inv.exercises) {
      const got = (refCount.get(String(ex.ex)) || []).slice().sort((a, b) => a - b);
      const want = [...Array(ex.count)].map((_, i) => i + 1);
      if (got.join(",") !== want.join(",")) err(U, `Ex.${ex.ex}: expected items 1..${ex.count}, data has [${got.join(",")}]`);
      refCount.delete(String(ex.ex));
    }
    for (const k of refCount.keys()) err(U, `Ex.${k} in data but not in inventory`);
    if ((inv.toeicMin || 15) > toeic) err(U, `only ${toeic} TOEIC questions (need ≥ ${inv.toeicMin || 15})`);
  }
  stats.push({ id: U, title: unit.title, lessons: unit.lessons.length, questions: qn, toeic, summary: unit.summary.length });
}

// manifest freshness
const manifestFile = path.join(root, "site/data/units.js");
if (fs.existsSync(manifestFile)) {
  const txt = fs.readFileSync(manifestFile, "utf8");
  for (const s of stats) if (!txt.includes(`"id": "${s.id}"`)) err("units.js", `${s.id} missing — run build-manifest`);
}

console.table(stats);
if (unknownWords.size) {
  console.log(`\nCapitalised words not in dictionary (review once, add to scripts/allow-words.txt if fine):`);
  console.log([...unknownWords.keys()].sort().join(", "));
}
for (const w of warnings) console.log("WARN", w);
for (const e of errors) console.log("ERROR", e);
console.log(`\n${errors.length} errors, ${warnings.length} warnings, ${allQ.size} questions`);
process.exit(errors.length ? 1 : 0);
