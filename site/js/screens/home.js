// Home: status, continue CTA, unit list.
import { h } from "../util.js";
import { icon } from "../ui/icon.js";
import { heartBadge, streakBadge, xpBadge, levelBadge, progressBar, mount, setTitle } from "../ui/common.js";
import { getState, tickHearts } from "../store.js";
import { getUnits } from "../data.js";
import { isUnitUnlocked, nextLesson, reviewDue, levelInfo } from "../game.js";

export function renderHome() {
  tickHearts();
  const s = getState();
  const units = getUnits();
  setTitle("");
  const nxt = nextLesson(s, units);
  const due = reviewDue(s).length;
  const lv = levelInfo(s.xp);

  let cta;
  if (nxt) {
    const u = units[nxt.unitIndex];
    const l = u.lessons[nxt.lessonIndex];
    const started = Object.keys(s.lessons).length > 0;
    cta = h(
      "section",
      { class: "card stack-sm", "aria-labelledby": "cta-title" },
      h("p", { class: "small muted", id: "cta-title" }, started ? "เรียนต่อจากที่ค้างไว้" : "เริ่มเรียนบทแรก"),
      h("p", { class: "unit-title" }, `บทที่ ${nxt.unitIndex + 1} · ${u.titleTh}`),
      h("p", { class: "muted" }, l.title),
      h("a", { class: "btn btn-primary btn-block", href: `#/lesson/${l.id}` }, icon("play_arrow", { size: "sm" }), started ? "เรียนต่อ" : "เริ่มเรียน"),
    );
  } else {
    cta = h(
      "section",
      { class: "card stack-sm center" },
      icon("emoji_events", { fill: true, cls: "big-icon" }),
      h("p", { class: "unit-title" }, "เรียนครบทุกบทแล้ว"),
      h("a", { class: "btn btn-primary btn-block", href: "#/mix" }, "ฝึกแนวข้อสอบ TOEIC แบบสุ่ม"),
    );
  }

  const list = h(
    "ol",
    { class: "path", "aria-label": "บทเรียนทั้งหมด" },
    units.map((u, i) => {
      const unlocked = isUnitUnlocked(s, units, i);
      const done = u.lessons.filter((l) => s.lessons[l.id]?.done).length;
      return h(
        "li",
        {},
        h(
          "a",
          { class: "card card-link unit-card" + (unlocked ? "" : " is-locked"), href: `#/unit/${u.id}` },
          h(
            "div",
            { class: "unit-head" },
            h("span", { class: "unit-num", "aria-hidden": "true" }, unlocked ? String(i + 1) : icon("lock")),
            h(
              "div",
              { style: { flex: "1", minWidth: "0" } },
              h("p", { class: "unit-title" }, h("span", { class: "sr-only" }, `บทที่ ${i + 1}: `), u.titleTh),
              h("p", { class: "small muted", lang: "en" }, u.title),
              h(
                "div",
                { class: "row", style: { marginTop: "8px" } },
                progressBar(done, u.lessons.length, `ความคืบหน้า ${u.titleTh}`, true),
                h("span", { class: "small muted num" }, `${done}/${u.lessons.length}`),
              ),
              unlocked ? null : h("p", { class: "small muted" }, "ล็อกอยู่ — อ่านสรุปได้ จบบทเรียนแรกของบทก่อนหน้าเพื่อปลดล็อก"),
            ),
          ),
        ),
      );
    }),
  );

  mount(
    h(
      "div",
      { class: "stack-lg" },
      h(
        "header",
        { class: "stack-sm" },
        h(
          "div",
          { class: "statusbar" },
          h("h1", {}, "Grammar Quest"),
          h("div", { class: "badges", "aria-label": "สถานะของคุณ", role: "group" }, streakBadge(s), xpBadge(s), heartBadge(s)),
        ),
        h(
          "div",
          { class: "row" },
          levelBadge(s),
          progressBar(lv.into, lv.span, `ความคืบหน้าสู่เลเวล ${lv.level + 1}`, true),
          h("span", { class: "small muted num" }, `อีก ${lv.toNext} XP`),
        ),
      ),
      cta,
      due
        ? h(
            "a",
            { class: "card card-link row-between", href: "#/review" },
            h("span", { class: "row" }, icon("history"), `มีข้อที่ถึงเวลาทบทวน ${due} ข้อ`),
            icon("chevron_right"),
          )
        : null,
      h("section", { class: "stack", "aria-labelledby": "units-h" }, h("h2", { id: "units-h" }, "บทเรียน"), list),
    ),
  );
}
