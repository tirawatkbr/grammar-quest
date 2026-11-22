// Summary (rule) card renderer.
import { h, rich } from "../util.js";
import { icon } from "./icon.js";

export function tipBox(text, title = "TIP สำหรับ TOEIC") {
  return h(
    "div",
    { class: "tip" },
    icon("lightbulb", { size: "sm" }),
    h("div", {}, h("p", { class: "tip-title" }, title), h("p", { class: "tip-body explain" }, rich(text))),
  );
}

/**
 * card: { title, body?, table?: {caption?, head:[], rows:[[]], en?: number[] (english column indexes)},
 *         examples?: [{en, th?}], tip? }
 */
export function summaryCard(card, { headingLevel = 3, index } = {}) {
  const H = "h" + headingLevel;
  const el = h("section", { class: "card summary-card stack-sm" });
  el.append(h(H, {}, index !== undefined ? `${index + 1}. ` : "", card.title));
  if (card.body) el.append(h("p", { class: "summary-body" }, rich(card.body)));
  if (card.table) {
    const enCols = new Set(card.table.en || []);
    const table = h(
      "table",
      { class: "table" + (card.table.head.length > 2 ? " table-stack" : "") },
      card.table.caption ? h("caption", { class: "sr-only" }, card.table.caption) : null,
      h("thead", {}, h("tr", {}, card.table.head.map((c) => h("th", { scope: "col" }, c)))),
      h(
        "tbody",
        {},
        card.table.rows.map((r) =>
          h("tr", {}, r.map((c, i) => h("td", { lang: enCols.has(i) ? "en" : undefined, "data-label": card.table.head[i] }, rich(c)))),
        ),
      ),
    );
    el.append(h("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": card.table.caption || card.title }, table));
  }
  if (card.examples?.length) {
    el.append(
      h(
        "ul",
        { class: "examples", "aria-label": "ตัวอย่าง" },
        card.examples.map((ex) =>
          h(
            "li",
            { class: "example" },
            h("p", { lang: "en" }, rich(ex.en)),
            ex.th ? h("p", { class: "example-th" }, rich(ex.th)) : null,
          ),
        ),
      ),
    );
  }
  if (card.tip) el.append(tipBox(card.tip));
  return el;
}
