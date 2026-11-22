// Shared UI: status announcements, toasts, dialogs, badges.
import { h, clear } from "../util.js";
import { icon } from "./icon.js";
import { MAX_HEARTS, heartsNow, streakNow, levelInfo } from "../game.js";

/** Announce a message to screen readers via the single app status region. */
export function announce(msg) {
  const el = document.getElementById("sr-status");
  if (!el) return;
  el.textContent = "";
  // next frame so repeated identical messages are re-announced
  requestAnimationFrame(() => (el.textContent = msg));
}

export function toast(message, { action, onAction, timeout = 4000 } = {}) {
  const host = document.getElementById("toasts");
  const t = h("div", { class: "toast", role: "status" }, h("span", { style: { flex: "1" } }, message));
  if (action) {
    t.append(
      h("button", { class: "btn", type: "button", onclick: () => { onAction?.(); t.remove(); } }, action),
    );
  }
  host.append(t);
  if (timeout) setTimeout(() => t.remove(), timeout);
  return t;
}

/**
 * Modal dialog built on <dialog>. Returns a promise resolving to the clicked action value
 * (or null when dismissed with Esc / close button).
 * content: Node | string; actions: [{label, value, variant}]
 */
export function openDialog({ title, content, actions = [{ label: "ปิด", value: null, variant: "primary" }], wide = false }) {
  return new Promise((resolve) => {
    const opener = document.activeElement;
    const titleId = "dlg-" + Math.random().toString(36).slice(2);
    const dlg = h("dialog", { class: "dialog" + (wide ? " dialog-wide" : ""), "aria-labelledby": titleId });
    let result = null;
    const close = (v) => {
      result = v;
      dlg.close();
    };
    const inner = h(
      "div",
      { class: "dialog-inner" },
      h(
        "div",
        { class: "dialog-head" },
        h("h2", { id: titleId, tabindex: "-1" }, title),
        h("button", { class: "btn btn-ghost btn-icon", type: "button", "aria-label": "ปิด", onclick: () => close(null) }, icon("close")),
      ),
      typeof content === "string" ? h("p", {}, content) : content,
      h(
        "div",
        { class: "dialog-actions" },
        actions.map((a) =>
          h("button", { class: `btn btn-${a.variant || "secondary"}`, type: "button", onclick: () => close(a.value) }, a.label),
        ),
      ),
    );
    dlg.append(inner);
    dlg.addEventListener("close", () => {
      dlg.remove();
      if (opener && opener.isConnected) opener.focus();
      resolve(result);
    });
    document.body.append(dlg);
    dlg.showModal();
    dlg.querySelector("h2").focus();
  });
}

export async function confirmDialog(title, message, { ok = "ยืนยัน", cancel = "ยกเลิก", danger = false } = {}) {
  const v = await openDialog({
    title,
    content: message,
    actions: [
      { label: cancel, value: false, variant: "secondary" },
      { label: ok, value: true, variant: danger ? "danger" : "primary" },
    ],
  });
  return v === true;
}

// ---------- badges ----------
export function heartBadge(state) {
  const unlimited = state.settings.unlimitedHearts;
  const n = heartsNow(state).n;
  const label = unlimited ? "หัวใจไม่จำกัด (โหมดฝึก)" : `หัวใจ ${n} จาก ${MAX_HEARTS} ดวง`;
  return h(
    "span",
    { class: "badge badge-heart", title: label },
    icon("favorite", { fill: true }),
    h("span", { "aria-hidden": "true" }, unlimited ? "∞" : String(n)),
    h("span", { class: "sr-only" }, label),
  );
}

export function streakBadge(state) {
  const n = streakNow(state);
  const label = `เรียนต่อเนื่อง ${n} วัน`;
  return h(
    "span",
    { class: "badge badge-streak", title: label },
    icon("local_fire_department", { fill: n > 0 }),
    h("span", { "aria-hidden": "true" }, String(n)),
    h("span", { class: "sr-only" }, label),
  );
}

export function xpBadge(state) {
  const label = `XP สะสม ${state.xp}`;
  return h(
    "span",
    { class: "badge badge-xp", title: label },
    icon("bolt", { fill: true }),
    h("span", { "aria-hidden": "true" }, String(state.xp)),
    h("span", { class: "sr-only" }, label),
  );
}

export function levelBadge(state) {
  const { level } = levelInfo(state.xp);
  const label = `เลเวล ${level}`;
  return h(
    "span",
    { class: "badge badge-level", title: label },
    icon("military_tech", { fill: true }),
    h("span", { "aria-hidden": "true" }, "Lv " + level),
    h("span", { class: "sr-only" }, label),
  );
}

export function progressBar(value, max, label, small = false) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return h(
    "div",
    {
      class: "progress" + (small ? " progress-sm" : ""),
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": String(max),
      "aria-valuenow": String(value),
      "aria-label": label,
      "aria-valuetext": `${value} จาก ${max}`,
    },
    h("div", { class: "progress-fill", style: { width: pct + "%" } }),
  );
}

export function setTitle(t) {
  document.title = t ? `${t} · Grammar Quest` : "Grammar Quest — ไวยากรณ์อังกฤษเพื่อ TOEIC";
}

let firstMount = true;

/** Replace main content and move focus to its h1 (WCAG 2.4.3).
 *  The very first render keeps the browser's natural focus start so Tab reaches the skip link first. */
export function mount(node, { focus = true } = {}) {
  const main = document.getElementById("main");
  clear(main);
  main.append(node);
  window.scrollTo(0, 0);
  const initial = firstMount;
  firstMount = false;
  if (focus && !initial) {
    const h1 = main.querySelector("h1");
    if (h1) {
      h1.setAttribute("tabindex", "-1");
      h1.focus({ preventScroll: true });
    } else main.focus({ preventScroll: true });
  }
}
