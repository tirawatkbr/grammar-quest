// Shared helpers for build/validation scripts (Node only).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const dataDir = path.join(root, "site/data");

/** Unit order: unit id → sheet chapter. */
export const UNIT_ORDER = [
  ["u01", 1],
  ["u02", 2],
  ["u03", 3],
  ["u04", 4],
  ["u05", 5],
  ["u06", 6],
  ["u07", 7],
  ["u08", 8],
  ["u09", 9],
  ["u10", 10],
  ["u11", 11],
  ["u12", 12],
  ["u13", 13],
  ["u14", 18],
];

/** Load all unit data files that exist, in order. */
export async function loadUnits() {
  const out = [];
  for (const [id] of UNIT_ORDER) {
    const file = path.join(dataDir, `${id}.js`);
    if (!fs.existsSync(file)) continue;
    const mod = await import(pathToFileURL(file).href + "?t=" + Date.now());
    out.push({ file: `${id}.js`, unit: mod.default });
  }
  return out;
}

export function splitBlanks(prompt) {
  return String(prompt).split("{_}");
}

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
