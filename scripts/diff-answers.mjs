// Compare stored answers with an independent second-pass solution in scripts/verify/<unit>.json
// verify file format: { "<qid>": "<answer>" }  where answer is
//   mcq: letter · error: number · choice-fill / type-fill: "x | y" (per blank) · order: full sentence
// Entries may also be { "answer": ..., "note": "resolution after review" } for documented disagreements.
// Usage: node scripts/diff-answers.mjs [u01 …]   (exit 1 on unresolved mismatches)
import fs from "node:fs";
import path from "node:path";
import { loadUnits, root } from "./lib.mjs";
import { normalize, matchesAny } from "../site/js/check.js";

const want = process.argv.slice(2);
const units = await loadUnits();
let bad = 0;
let checked = 0;
for (const { unit } of units) {
  if (want.length && !want.includes(unit.id)) continue;
  const f = path.join(root, `scripts/verify/${unit.id}.json`);
  if (!fs.existsSync(f)) {
    console.log(`${unit.id}: no verify file`);
    bad++;
    continue;
  }
  const v = JSON.parse(fs.readFileSync(f, "utf8"));
  const ids = new Set();
  for (const l of unit.lessons)
    for (const q of l.questions) {
      ids.add(q.id);
      const entry = v[q.id];
      if (entry === undefined) {
        console.log(`MISSING ${q.id}`);
        bad++;
        continue;
      }
      const mine = typeof entry === "object" && entry !== null ? entry.answer : entry;
      const note = typeof entry === "object" && entry !== null ? entry.note : null;
      let same;
      switch (q.type) {
        case "mcq":
          same = [q.answer, ...(q.alsoCorrect || [])].includes(String(mine));
          break;
        case "error":
          same = [q.answer].flat().map(Number).sort().join(",") === String(mine).split(",").map((x) => Number(x.trim())).sort().join(",");
          break;
        case "choice-fill":
        case "type-fill": {
          const parts = String(mine).split("|").map((x) => x.trim());
          same = parts.length === q.answer.length && q.answer.every((a, i) => matchesAny(parts[i], [a].flat()));
          break;
        }
        case "order":
          same = [q.answer, ...(q.accept || [])].some((a) => normalize(a) === normalize(mine));
          break;
      }
      checked++;
      if (!same && !note) {
        bad++;
        console.log(`MISMATCH ${q.id}: stored=${JSON.stringify(q.answer)} second-pass=${JSON.stringify(mine)}`);
      } else if (!same && note) console.log(`RESOLVED ${q.id}: ${note}`);
    }
  for (const k of Object.keys(v)) if (!ids.has(k)) console.log(`EXTRA ${k} (not in data)`);
}
console.log(`${checked} compared, ${bad} unresolved`);
process.exit(bad ? 1 : 0);
