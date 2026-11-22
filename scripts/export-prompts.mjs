// Print questions WITHOUT answers for an independent second solving pass.
// Usage: node scripts/export-prompts.mjs u01
import { loadUnits, parseSpots } from "./lib.mjs";

const id = process.argv[2];
const units = await loadUnits();
const u = units.find((x) => x.unit.id === id)?.unit;
if (!u) throw new Error("unit not found " + id);
const L = ["a", "b", "c", "d", "e"];
for (const l of u.lessons) {
  console.log(`\n## ${l.id} ${l.instructionEn || l.instruction || ""}`);
  for (const q of l.questions) {
    let line = `${q.id} [${q.type}] `;
    if (q.context) line += `CONTEXT: ${q.context.replace(/\n/g, " / ")} || `;
    if (q.type === "error") line += parseSpots(q.prompt).map((s) => (s.n ? `(${s.n})[${s.text}]` : s.text)).join("");
    else line += q.prompt.replace(/\n/g, " / ");
    if (q.choices) line += "  " + q.choices.map((c, i) => `${L[i]}) ${c}`).join("  ");
    if (q.options) line += "  OPTIONS: " + q.options.join(" | ");
    if (q.optionsPerBlank) line += "  OPTIONS: " + q.optionsPerBlank.map((o) => o.join("|")).join(" ; ");
    if (q.type === "order") line += "  WORDS: " + [...q.answer.split(/\s+/), ...(q.distractors || [])].sort().join(" ");
    console.log(line);
  }
}
