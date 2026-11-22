// WCAG 2.1 contrast checker for design tokens in site/css/tokens.css.
// Usage: node scripts/contrast.mjs   (exit code 1 if any required pair fails)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(root, "site/css/tokens.css"), "utf8");

function block(selector) {
  const i = css.indexOf(selector + " {");
  if (i < 0) throw new Error("missing block " + selector);
  const body = css.slice(i, css.indexOf("}", i));
  const vars = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) vars[m[1]] = m[2];
  return vars;
}
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background, minimum ratio, description]
const PAIRS = [
  ["text", "bg", 4.5, "body text on page"],
  ["text", "surface", 4.5, "body text on card"],
  ["text-muted", "bg", 4.5, "muted text on page"],
  ["text-muted", "surface", 4.5, "muted text on card"],
  ["text-muted", "surface-2", 4.5, "muted text on sunken surface"],
  ["text", "surface-2", 4.5, "text on sunken surface"],
  ["on-primary", "primary", 4.5, "primary button label"],
  ["primary", "surface", 4.5, "link / primary text on card"],
  ["primary", "bg", 4.5, "link / primary text on page"],
  ["primary", "primary-soft", 4.5, "selected option text"],
  ["success", "success-soft", 4.5, "correct feedback text"],
  ["danger", "danger-soft", 4.5, "wrong feedback text"],
  ["success", "surface", 4.5, "success text on card"],
  ["danger", "surface", 4.5, "danger text on card"],
  ["warning", "surface", 4.5, "warning text on card"],
  ["warning", "warning-soft", 4.5, "tip text on tip box"],
  ["on-success", "success", 4.5, "button label on success"],
  ["on-danger", "danger", 4.5, "button label on danger"],
  ["heart", "surface", 3, "heart icon (non-text)"],
  ["streak", "surface", 3, "streak icon (non-text)"],
  ["xp", "surface", 3, "xp icon (non-text)"],
  ["border-strong", "surface", 3, "input/option border (non-text)"],
  ["border-strong", "bg", 3, "input/option border on page (non-text)"],
  ["focus", "surface", 3, "focus ring on card (non-text)"],
  ["focus", "bg", 3, "focus ring on page (non-text)"],
  ["primary", "track", 3, "progress fill vs track (non-text)"],
];

let failed = 0;
for (const [name, sel] of [["light", ":root"], ["dark", ':root[data-theme="dark"]']]) {
  const base = block(":root");
  const v = name === "light" ? base : { ...base, ...block(sel) };
  console.log(`\n## ${name}`);
  console.log("| Foreground | Background | Ratio | Required | Pass |\n|---|---|---|---|---|");
  for (const [fg, bg, min, desc] of PAIRS) {
    if (!v[fg] || !v[bg]) { console.log(`missing token ${fg} or ${bg}`); failed++; continue; }
    const r = ratio(v[fg], v[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`| ${desc}: --${fg} ${v[fg]} | --${bg} ${v[bg]} | ${r.toFixed(2)}:1 | ${min}:1 | ${ok ? "✅" : "❌"} |`);
  }
}
console.log(failed ? `\n${failed} FAILED` : "\nall pairs pass");
process.exit(failed ? 1 : 0);
