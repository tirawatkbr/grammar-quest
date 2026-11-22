// Settings: theme, practice options, sync (code + Google), reset, credits.
import { h } from "../util.js";
import { icon } from "../ui/icon.js";
import { mount, setTitle, toast, openDialog, confirmDialog, announce } from "../ui/common.js";
import { getState, update, replaceState } from "../store.js";
import { encodeState, decodeState, SyncCodeError } from "../sync-code.js";
import { mergeStates, summarize } from "../merge.js";
import { newState } from "../game.js";
import { applyTheme } from "../theme.js";
import * as cloud from "../sync-firebase.js";

export function renderSettings() {
  const s = getState();
  setTitle("ตั้งค่า");

  // theme
  const themes = [
    { v: "auto", label: "ตามระบบ", ic: "settings" },
    { v: "light", label: "สว่าง", ic: "light_mode" },
    { v: "dark", label: "มืด", ic: "dark_mode" },
  ];
  const themeGroup = h("div", { class: "segmented", role: "radiogroup", "aria-labelledby": "theme-h" });
  const themeBtns = themes.map((t, i) => {
    const b = h(
      "button",
      { class: "btn", type: "button", role: "radio", "aria-checked": String(s.settings.theme === t.v), tabindex: s.settings.theme === t.v ? "0" : "-1" },
      icon(t.ic, { size: "sm" }),
      t.label,
    );
    b.addEventListener("click", () => setTheme(i));
    b.addEventListener("keydown", (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (d) {
        e.preventDefault();
        const n = (i + d + themes.length) % themes.length;
        setTheme(n);
        themeBtns[n].focus();
      }
    });
    return b;
  });
  themeGroup.append(...themeBtns);
  function paintTheme() {
    themeBtns.forEach((b, i) => {
      const on = getState().settings.theme === themes[i].v;
      b.setAttribute("aria-checked", String(on));
      b.setAttribute("tabindex", on ? "0" : "-1");
      b.className = "btn " + (on ? "btn-primary" : "btn-secondary");
    });
  }
  function setTheme(i) {
    update((st) => (st.settings.theme = themes[i].v));
    applyTheme();
    paintTheme();
  }
  paintTheme();

  const sw = (key, label, desc) => {
    const id = "sw-" + key;
    const btn = h("button", { class: "switch", type: "button", role: "switch", id, "aria-checked": String(Boolean(s.settings[key])), "aria-describedby": id + "-d" });
    btn.addEventListener("click", () => {
      update((st) => (st.settings[key] = !st.settings[key]));
      btn.setAttribute("aria-checked", String(Boolean(getState().settings[key])));
    });
    return h(
      "div",
      { class: "switch-row" },
      h("div", {}, h("label", { for: id, style: { fontWeight: "500" } }, label), h("p", { class: "small muted", id: id + "-d" }, desc)),
      btn,
    );
  };

  // sync code
  const codeOut = h("textarea", { class: "input", id: "code-out", readonly: true, rows: "4", "aria-describedby": "code-help" });
  const codeIn = h("textarea", { class: "input", id: "code-in", rows: "4", placeholder: "GQ1.…", "aria-describedby": "code-in-err" });
  const codeErr = h("p", { class: "small", id: "code-in-err", style: { color: "var(--danger)" }, role: "alert" });
  const makeBtn = h("button", { class: "btn btn-secondary", type: "button" }, icon("refresh", { size: "sm" }), "สร้างรหัส");
  const copyBtn = h("button", { class: "btn btn-secondary", type: "button", disabled: true }, icon("content_copy", { size: "sm" }), "คัดลอก");
  const shareBtn = h("button", { class: "btn btn-secondary", type: "button", disabled: true, hidden: !navigator.share }, icon("share", { size: "sm" }), "แชร์");
  const importBtn = h("button", { class: "btn btn-primary", type: "button" }, icon("content_paste", { size: "sm" }), "รวมความคืบหน้าจากรหัส");

  makeBtn.addEventListener("click", async () => {
    codeOut.value = await encodeState(getState());
    copyBtn.disabled = false;
    shareBtn.disabled = false;
    announce("สร้างรหัสซิงก์แล้ว");
  });
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(codeOut.value);
      toast("คัดลอกรหัสแล้ว — นำไปวางในอีกเครื่อง");
    } catch {
      codeOut.select();
      toast("คัดลอกอัตโนมัติไม่ได้ — กด Ctrl+C / แตะค้างเพื่อคัดลอก");
    }
  });
  shareBtn.addEventListener("click", () => navigator.share?.({ title: "รหัสซิงก์ Grammar Quest", text: codeOut.value }).catch(() => {}));
  importBtn.addEventListener("click", async () => {
    codeErr.textContent = "";
    codeIn.removeAttribute("aria-invalid");
    try {
      const remote = await decodeState(codeIn.value);
      const sm = summarize(remote);
      const ok = await confirmDialog(
        "รวมความคืบหน้า?",
        `รหัสนี้มี XP ${sm.xp}, จบ ${sm.lessonsDone} บทเรียน, streak ${sm.streak} วัน, ข้อทบทวน ${sm.reviewItems} ข้อ — ระบบจะรวมกับข้อมูลในเครื่องนี้ (เก็บค่าที่ดีกว่าของแต่ละส่วน) ไม่มีอะไรหาย`,
        { ok: "รวมเลย" },
      );
      if (!ok) return;
      replaceState(mergeStates(getState(), remote));
      codeIn.value = "";
      toast("รวมความคืบหน้าเรียบร้อย");
      cloud.pushSoon();
    } catch (e) {
      codeErr.textContent = e instanceof SyncCodeError ? e.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
      codeIn.setAttribute("aria-invalid", "true");
      codeIn.focus();
    }
  });

  // Google sync
  const cloudBox = h("div", { class: "stack-sm" });
  function paintCloud() {
    const st = cloud.status();
    cloudBox.replaceChildren();
    if (!st.configured) {
      cloudBox.append(
        h("p", { class: "small muted" }, "ยังไม่ได้ตั้งค่า Firebase — ใช้รหัสซิงก์ด้านบนไปก่อนได้ (วิธีตั้งค่าอยู่ใน README ของโปรเจกต์)"),
      );
      return;
    }
    if (st.user) {
      cloudBox.append(
        h("p", {}, "เข้าสู่ระบบเป็น ", h("strong", {}, st.user.email || st.user.displayName || "บัญชี Google")),
        h("p", { class: "small muted" }, st.lastSync ? `ซิงก์ล่าสุด ${new Date(st.lastSync).toLocaleString("th-TH")}` : "กำลังซิงก์…"),
        h(
          "div",
          { class: "row", style: { flexWrap: "wrap" } },
          h("button", { class: "btn btn-secondary", type: "button", onclick: async () => { await cloud.syncNow(); paintCloud(); toast("ซิงก์แล้ว"); } }, icon("cloud_sync", { size: "sm" }), "ซิงก์ตอนนี้"),
          h("button", { class: "btn btn-ghost", type: "button", onclick: async () => { await cloud.signOut(); paintCloud(); } }, icon("logout", { size: "sm" }), "ออกจากระบบ"),
        ),
      );
    } else {
      cloudBox.append(
        h("p", { class: "small muted" }, "ล็อกอินด้วยบัญชี Google เดียวกันทุกเครื่อง แล้วความคืบหน้าจะซิงก์อัตโนมัติ"),
        h("button", { class: "btn btn-primary", type: "button", onclick: async () => { try { await cloud.signIn(); } catch (e) { toast("เข้าสู่ระบบไม่สำเร็จ: " + (e?.message || e)); } paintCloud(); } }, icon("login", { size: "sm" }), "เข้าสู่ระบบด้วย Google"),
      );
    }
  }
  paintCloud();
  cloud.onChange(paintCloud);

  // reset
  const resetBtn = h("button", { class: "btn btn-danger", type: "button" }, icon("delete", { size: "sm" }), "ลบความคืบหน้าทั้งหมด");
  resetBtn.addEventListener("click", async () => {
    const input = h("input", { class: "input", id: "reset-confirm", autocomplete: "off" });
    const v = await openDialog({
      title: "ลบความคืบหน้าทั้งหมด?",
      content: h(
        "div",
        { class: "stack-sm" },
        h("p", {}, "XP, streak, บทเรียนที่จบ และคลังทบทวนในเครื่องนี้จะถูกลบ และกู้คืนไม่ได้ (แนะนำให้สร้างรหัสซิงก์เก็บไว้ก่อน)"),
        h("div", { class: "field" }, h("label", { for: "reset-confirm" }, "พิมพ์คำว่า ลบ เพื่อยืนยัน"), input),
      ),
      actions: [
        { label: "ยกเลิก", value: false, variant: "secondary" },
        { label: "ลบทั้งหมด", value: "go", variant: "danger" },
      ],
    });
    if (v === "go" && input.value.trim() === "ลบ") {
      const keep = getState().settings;
      const fresh = newState();
      fresh.settings = keep;
      replaceState(fresh);
      toast("ลบความคืบหน้าแล้ว");
      renderSettings();
    } else if (v === "go") toast("ไม่ได้ลบ — ต้องพิมพ์คำว่า ลบ ให้ตรง");
  });

  mount(
    h(
      "div",
      { class: "stack-lg" },
      h("h1", {}, "ตั้งค่า"),
      h("section", { class: "card stack", "aria-labelledby": "theme-h" }, h("h2", { id: "theme-h" }, "ธีม"), themeGroup),
      h(
        "section",
        { class: "card stack", "aria-labelledby": "practice-h" },
        h("h2", { id: "practice-h" }, "การฝึก"),
        sw("unlimitedHearts", "โหมดฝึกไม่จำกัดหัวใจ", "ตอบผิดไม่เสียหัวใจ เหมาะกับการอ่านทบทวนก่อนสอบ"),
        sw("mixTimer", "จับเวลาใน TOEIC Mix", "แสดงเวลาที่ใช้เทียบกับเป้า 30 วินาทีต่อข้อ (ไม่บังคับหมดเวลา)"),
      ),
      h(
        "section",
        { class: "card stack", "aria-labelledby": "sync-h" },
        h("h2", { id: "sync-h" }, "ซิงก์ข้ามเครื่อง"),
        h("h3", {}, "1) รหัสซิงก์"),
        h("p", { class: "small muted", id: "code-help" }, "เครื่องที่มีข้อมูล: กด “สร้างรหัส” แล้วคัดลอก → อีกเครื่อง: วางรหัสด้านล่างแล้วกดรวม (ทำได้ทั้งสองทาง)"),
        h("div", { class: "field" }, h("label", { for: "code-out" }, "รหัสของเครื่องนี้"), codeOut),
        h("div", { class: "row", style: { flexWrap: "wrap" } }, makeBtn, copyBtn, shareBtn),
        h("div", { class: "field" }, h("label", { for: "code-in" }, "วางรหัสจากอีกเครื่อง"), codeIn, codeErr),
        importBtn,
        h("hr", { class: "divider" }),
        h("h3", {}, "2) บัญชี Google (อัตโนมัติ)"),
        cloudBox,
      ),
      h("section", { class: "card stack", "aria-labelledby": "data-h" }, h("h2", { id: "data-h" }, "ข้อมูล"), resetBtn),
      h(
        "section",
        { class: "card stack-sm", "aria-labelledby": "about-h" },
        h("h2", { id: "about-h" }, "เกี่ยวกับ"),
        h("p", { class: "small" }, "Grammar Quest — ฝึกไวยากรณ์อังกฤษเพื่อสอบ TOEIC จากชีท BASIC GRAMMAR (ใช้เพื่อการศึกษาส่วนตัว) พร้อมข้อแนว TOEIC Part 5/6 ที่แต่งเพิ่ม"),
        h("p", { class: "small muted" }, "ฟอนต์ IBM Plex Sans Thai (SIL Open Font License) และไอคอน Material Symbols (Apache License 2.0) จาก Google Fonts"),
        h("p", { class: "small muted" }, "ความคืบหน้าเก็บในเครื่องนี้เท่านั้น เว้นแต่คุณเลือกซิงก์"),
      ),
    ),
  );
}
