// Stats: totals, last 7 days XP, accuracy per unit.
import { h, dayKey, addDays } from "../util.js";
import { icon } from "../ui/icon.js";
import { mount, setTitle, progressBar } from "../ui/common.js";
import { getState } from "../store.js";
import { getUnits } from "../data.js";
import { levelInfo, streakNow } from "../game.js";

const DOW = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export function renderStats() {
  const s = getState();
  const units = getUnits();
  setTitle("สถิติ");
  const lv = levelInfo(s.xp);
  const today = dayKey();
  const days = [...Array(7)].map((_, i) => addDays(today, i - 6));
  const maxXp = Math.max(10, ...days.map((d) => s.daily[d] || 0));
  const lessonsDone = Object.values(s.lessons).filter((l) => l.done).length;
  const totalLessons = units.reduce((a, u) => a + u.lessons.length, 0);
  const answered = Object.values(s.questions);
  const totalRight = answered.reduce((a, r) => a + r.right, 0);
  const totalSeen = answered.reduce((a, r) => a + r.seen, 0);

  const stat = (v, label, ic) =>
    h("div", { class: "card stat" }, h("span", { class: "row muted" }, icon(ic, { size: "sm" }), h("span", { class: "stat-label" }, label)), h("span", { class: "stat-value" }, v));

  const week = h(
    "ul",
    { class: "bars", "aria-label": "XP รายวัน 7 วันล่าสุด" },
    days.map((d) => {
      const v = s.daily[d] || 0;
      const [y, m, dd] = d.split("-").map(Number);
      const dow = DOW[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()];
      return h(
        "li",
        { class: "bar-row" },
        h("span", {}, d === today ? "วันนี้" : `${dow} ${dd}/${m}`),
        h("div", { "aria-hidden": "true" }, progressBarStatic(v, maxXp)),
        h("span", { class: "bar-value" }, `${v} XP`),
      );
    }),
  );

  const perUnit = h(
    "ul",
    { class: "bars", "aria-label": "ความแม่นยำแต่ละบท" },
    units.map((u, i) => {
      const recs = Object.entries(s.questions).filter(([id]) => id.startsWith(u.id + "-")).map(([, r]) => r);
      const seen = recs.reduce((a, r) => a + r.seen, 0);
      const right = recs.reduce((a, r) => a + r.right, 0);
      const pct = seen ? Math.round((right / seen) * 100) : null;
      return h(
        "li",
        { class: "bar-row", style: { gridTemplateColumns: "minmax(0, 9em) 1fr 3.5em" } },
        h("span", {}, `${i + 1}. ${u.titleTh}`),
        h("div", { "aria-hidden": "true" }, progressBarStatic(pct || 0, 100)),
        h("span", { class: "bar-value" }, pct === null ? "—" : `${pct}%`),
      );
    }),
  );

  mount(
    h(
      "div",
      { class: "stack-lg" },
      h("h1", {}, "สถิติของฉัน"),
      h(
        "div",
        { class: "stat-grid" },
        stat(String(s.xp), "XP สะสม", "bolt"),
        stat(`Lv ${lv.level}`, `อีก ${lv.toNext} XP ถึงเลเวลถัดไป`, "military_tech"),
        stat(`${streakNow(s)} วัน`, `เรียนต่อเนื่อง (สูงสุด ${s.streak.best} วัน)`, "local_fire_department"),
        stat(`${lessonsDone}/${totalLessons}`, "บทเรียนที่จบ", "task_alt"),
        stat(totalSeen ? `${Math.round((totalRight / totalSeen) * 100)}%` : "—", `ตอบถูก ${totalRight} จาก ${totalSeen} ครั้ง`, "check_circle"),
        stat(String(answered.filter((r) => r.box > 0).length), "ข้อในคลังทบทวน", "history"),
      ),
      h("section", { class: "card stack-sm" }, h("h2", {}, "XP 7 วันล่าสุด"), week),
      h("section", { class: "card stack-sm" }, h("h2", {}, "ความแม่นยำแต่ละบท"), h("p", { class: "small muted" }, "นับจากทุกครั้งที่ตอบ (รวมการทำซ้ำ) · — = ยังไม่เคยทำ"), perUnit),
    ),
  );
}

function progressBarStatic(v, max) {
  const pct = max ? Math.round((v / max) * 100) : 0;
  return h("div", { class: "progress progress-sm" }, h("div", { class: "progress-fill", style: { width: pct + "%" } }));
}
