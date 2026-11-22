// Unit page: summary cards + lesson path.
import { h } from "../util.js";
import { icon } from "../ui/icon.js";
import { summaryCard } from "../ui/summary.js";
import { mount, setTitle, openDialog, progressBar } from "../ui/common.js";
import { getState } from "../store.js";
import { getUnits, loadUnit, unitIndexById } from "../data.js";
import { isUnitUnlocked, isLessonUnlocked } from "../game.js";

export async function renderUnit(unitId, { tab = "lessons" } = {}) {
  const ui = unitIndexById(unitId);
  if (ui < 0) {
    location.hash = "#/";
    return;
  }
  const units = getUnits();
  const meta = units[ui];
  const unit = await loadUnit(unitId);
  const s = getState();
  const unlocked = isUnitUnlocked(s, units, ui);
  setTitle(`บทที่ ${ui + 1} ${unit.titleTh}`);
  const done = meta.lessons.filter((l) => s.lessons[l.id]?.done).length;

  const lessons = h(
    "ol",
    { class: "path", "aria-label": "บทเรียนย่อย" },
    unit.lessons.map((l, li) => {
      const open = isLessonUnlocked(s, units, ui, li);
      const rec = s.lessons[l.id];
      const state = rec?.done ? "is-done" : open ? "" : "is-locked";
      const status = rec?.done ? `จบแล้ว · ดีที่สุด ${rec.best}%` : open ? "พร้อมเรียน" : "ล็อกอยู่";
      const node = h(
        open ? "a" : "button",
        open
          ? { class: `lesson-node ${state}`, href: `#/lesson/${l.id}` }
          : { class: `lesson-node ${state}`, type: "button" },
        h("span", { class: "lesson-dot", "aria-hidden": "true" }, icon(rec?.done ? "check" : open ? (l.kind === "toeic" ? "quiz" : "edit") : "lock")),
        h(
          "span",
          { class: "lesson-meta" },
          h("span", { class: "lesson-name", style: { display: "block" } }, l.title),
          h("span", { class: "small muted", style: { display: "block" } }, `${l.questions.length} ข้อ · ${status}`),
        ),
        open ? icon("chevron_right") : null,
      );
      if (!open) {
        node.addEventListener("click", () =>
          openDialog({
            title: "บทเรียนนี้ยังล็อกอยู่",
            content: unlocked
              ? "เรียนบทเรียนก่อนหน้าให้จบก่อน แล้วบทเรียนนี้จะเปิดให้เรียน"
              : "จบบทเรียนแรกของบทก่อนหน้า เพื่อปลดล็อกบทนี้ (อ่านสรุปของบทนี้ได้เลย)",
          }),
        );
      }
      return h("li", {}, node);
    }),
  );

  const summary = h(
    "div",
    { class: "stack" },
    unit.intro ? h("p", { class: "muted" }, unit.intro) : null,
    ...unit.summary.map((c, i) => summaryCard(c, { headingLevel: 3, index: i })),
  );

  const tabs = h("div", { class: "segmented", role: "tablist", "aria-label": "ส่วนของบท" });
  const panel = h("div", { role: "tabpanel", id: "unit-panel", tabindex: "0" });
  const defs = [
    { key: "lessons", label: "บทเรียน", icon: "edit", body: lessons },
    { key: "summary", label: `สรุปเนื้อหา (${unit.summary.length})`, icon: "menu_book", body: summary },
  ];
  const btns = defs.map((d, i) =>
    h(
      "button",
      {
        class: "btn btn-secondary",
        role: "tab",
        type: "button",
        id: `tab-${d.key}`,
        "aria-controls": "unit-panel",
        onclick: () => select(i, true),
        onkeydown: (e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            select((i + 1) % defs.length, true);
            btns[(i + 1) % defs.length].focus();
          }
        },
      },
      icon(d.icon, { size: "sm" }),
      d.label,
    ),
  );
  tabs.append(...btns);
  function select(i, push) {
    btns.forEach((b, j) => {
      b.setAttribute("aria-selected", String(i === j));
      b.setAttribute("tabindex", i === j ? "0" : "-1");
      b.className = "btn " + (i === j ? "btn-primary" : "btn-secondary");
    });
    panel.setAttribute("aria-labelledby", btns[i].id);
    panel.replaceChildren(defs[i].body);
    if (push) history.replaceState(null, "", `#/unit/${unitId}${defs[i].key === "summary" ? "/summary" : ""}`);
  }
  select(tab === "summary" ? 1 : 0, false);

  mount(
    h(
      "div",
      { class: "stack-lg" },
      h("a", { class: "btn btn-ghost", href: "#/", style: { alignSelf: "flex-start" } }, icon("arrow_back", { size: "sm" }), "หน้าหลัก"),
      h(
        "header",
        { class: "stack-sm" },
        h("p", { class: "small muted" }, `บทที่ ${ui + 1} · จากชีทบทที่ ${unit.chapter}`),
        h("h1", {}, unit.titleTh),
        h("p", { class: "muted", lang: "en" }, unit.title),
        h(
          "div",
          { class: "row" },
          progressBar(done, meta.lessons.length, "บทเรียนที่จบแล้ว", true),
          h("span", { class: "small muted num" }, `${done}/${meta.lessons.length} บทเรียน`),
        ),
        unlocked ? null : h("p", { class: "pill" }, icon("lock", { size: "sm" }), "ล็อกอยู่ — อ่านสรุปได้"),
      ),
      tabs,
      panel,
    ),
  );
}
