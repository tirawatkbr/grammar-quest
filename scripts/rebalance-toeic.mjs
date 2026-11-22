// Re-order the choices of TOEIC (kind: "toeic") mcq questions so the correct letter is spread evenly
// (a, b, c, d …), remapping whyWrong keys. Rewrites only the TOEIC lesson block of the unit file.
// Usage: node scripts/rebalance-toeic.mjs u04 [--check]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { dataDir } from "./lib.mjs";

const [id, flag] = process.argv.slice(2);
const file = path.join(dataDir, `${id}.js`);
const src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const unit = (await import(pathToFileURL(file).href + "?t=" + Date.now())).default;
const L = ["a", "b", "c", "d", "e"];

const lesson = unit.lessons.find((l) => l.kind === "toeic");
if (!lesson) throw new Error("no toeic lesson");
const mcqs = lesson.questions.filter((q) => q.type === "mcq");
const counts = Object.fromEntries(L.map((k) => [k, mcqs.filter((q) => q.answer === k).length]));
console.log(id, "current answer distribution:", counts);
if (flag === "--check") process.exit(0);

// deterministic target pattern without long runs
const pattern = ["c", "a", "d", "b", "b", "d", "a", "c", "d", "c", "b", "a", "a", "d", "c", "b", "a", "c", "d", "b"];
let k = 0;
const S = (v) => JSON.stringify(v);
const lines = [];
lines.push("    {");
lines.push(`      kind: "toeic",`);
lines.push(`      title: ${S(lesson.title)},`);
lines.push(`      instruction: ${S(lesson.instruction)},`);
lines.push(`      instructionEn: ${S(lesson.instructionEn)},`);
if (lesson.shuffle) lines.push(`      shuffle: true,`);
lines.push(`      questions: [`);
for (const q of lesson.questions) {
  let { choices, answer, whyWrong } = q;
  if (q.type === "mcq") {
    const n = choices.length;
    const target = pattern[k++ % pattern.length];
    const ti = Math.min(L.indexOf(target), n - 1);
    const ci = L.indexOf(answer);
    // move correct choice to ti, keep the others in original relative order
    const others = choices.map((c, i) => i).filter((i) => i !== ci);
    const order = [...others];
    order.splice(ti, 0, ci); // order[newIndex] = oldIndex
    const newChoices = order.map((i) => choices[i]);
    const newWhy = {};
    order.forEach((oldI, newI) => {
      const oldKey = L[oldI];
      if (whyWrong && whyWrong[oldKey]) newWhy[L[newI]] = whyWrong[oldKey];
    });
    choices = newChoices;
    answer = L[ti];
    whyWrong = newWhy;
    if (q.alsoCorrect) throw new Error("alsoCorrect not supported here");
  }
  lines.push("        {");
  lines.push(`          type: ${S(q.type)}, summaryRef: ${q.summaryRef},`);
  if (q.context) lines.push(`          context: ${S(q.context)},`);
  lines.push(`          prompt: ${S(q.prompt)},`);
  if (choices) lines.push(`          choices: ${S(choices)},`);
  lines.push(`          answer: ${S(answer)},`);
  lines.push(`          explain: ${S(q.explain)},`);
  if (whyWrong && Object.keys(whyWrong).length) {
    const ordered = Object.keys(whyWrong).sort().map((kk) => `${kk}: ${S(whyWrong[kk])}`);
    lines.push(`          whyWrong: { ${ordered.join(", ")} },`);
  }
  if (q.tip) lines.push(`          tip: ${S(q.tip)},`);
  lines.push("        },");
}
lines.push("      ],");
lines.push("    },");

// locate the toeic lesson block in the source text
const start = src.indexOf('      kind: "toeic",');
if (start < 0) throw new Error("toeic block not found");
const blockStart = src.lastIndexOf("    {", start);
const endMarker = "\n  ],\n});";
const blockEnd = src.lastIndexOf(endMarker);
if (blockEnd < start) throw new Error("toeic block must be the last lesson");
const out = src.slice(0, blockStart) + lines.join("\n") + src.slice(blockEnd);
fs.writeFileSync(file, out);
const after = (await import(pathToFileURL(file).href + "?t2=" + Date.now())).default.lessons.find((l) => l.kind === "toeic");
console.log(
  "new distribution:",
  Object.fromEntries(L.map((x) => [x, after.questions.filter((q) => q.answer === x).length])),
);
