// App entry: navigation shell, hash router, service worker.
import { h } from "./util.js";
import { icon } from "./ui/icon.js";
import { toast } from "./ui/common.js";
import { applyTheme } from "./theme.js";
import { renderHome } from "./screens/home.js";
import { renderUnit } from "./screens/unit.js";
import { startLesson, renderReview, startReview, startMix } from "./screens/play.js";
import { renderStats } from "./screens/stats.js";
import { renderSettings } from "./screens/settings.js";
import * as cloud from "./sync-firebase.js";

applyTheme();

const NAV = [
  { key: "learn", label: "เรียน", icon: "school", hash: "#/" },
  { key: "review", label: "ทบทวน", icon: "history", hash: "#/review" },
  { key: "stats", label: "สถิติ", icon: "bar_chart", hash: "#/stats" },
  { key: "settings", label: "ตั้งค่า", icon: "settings", hash: "#/settings" },
];

function buildNav() {
  const nav = document.getElementById("nav");
  nav.replaceChildren(
    h("div", { class: "nav-brand" }, icon("school"), "Grammar Quest"),
    h(
      "ul",
      { class: "nav-list" },
      NAV.map((n) =>
        h("li", { class: "nav-item" }, h("a", { class: "nav-link", href: n.hash, "data-key": n.key }, icon(n.icon), h("span", {}, n.label))),
      ),
    ),
  );
}

function markNav(key) {
  document.querySelectorAll(".nav-link").forEach((a) => {
    if (a.dataset.key === key) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

let active = null; // current session handle (has dispose)

async function route() {
  active?.dispose?.();
  active = null;
  document.body.classList.remove("focus-mode");
  document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  const raw = location.hash.replace(/^#/, "") || "/";
  const path = raw.split("?")[0];
  const parts = path.split("/").filter(Boolean);
  try {
    switch (parts[0]) {
      case undefined:
        markNav("learn");
        renderHome();
        break;
      case "unit":
        markNav("learn");
        await renderUnit(parts[1], { tab: parts[2] === "summary" ? "summary" : "lessons" });
        break;
      case "lesson":
        markNav("learn");
        active = await startLesson(parts[1]);
        break;
      case "review":
        markNav("review");
        if (parts[1] === "due" || parts[1] === "all") active = await startReview(parts[1]);
        else await renderReview();
        break;
      case "mix":
        markNav("review");
        active = await startMix();
        break;
      case "stats":
        markNav("stats");
        renderStats();
        break;
      case "settings":
        markNav("settings");
        renderSettings();
        break;
      default:
        location.replace("#/");
    }
  } catch (e) {
    console.error(e);
    toast("เกิดข้อผิดพลาดในการเปิดหน้านี้ — ลองโหลดใหม่", { timeout: 6000 });
  }
}

function offlineBar() {
  const bar = document.getElementById("offline");
  const paint = () => {
    bar.hidden = navigator.onLine;
  };
  bar.replaceChildren(icon("wifi_off", { size: "sm" }), "ออฟไลน์อยู่ — เรียนต่อได้ตามปกติ ความคืบหน้าเก็บในเครื่อง");
  window.addEventListener("online", paint);
  window.addEventListener("offline", paint);
  paint();
}

function registerSW() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  navigator.serviceWorker.register("./sw.js").then((reg) => {
    if (!reg) return;
    const prompt = (worker) => {
      toast("มีเวอร์ชันใหม่ของแอป", {
        action: "อัปเดต",
        timeout: 0,
        onAction: () => worker.postMessage({ type: "SKIP_WAITING" }),
      });
    };
    if (reg.waiting && navigator.serviceWorker.controller) prompt(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w?.addEventListener("statechange", () => {
        if (w.state === "installed" && navigator.serviceWorker.controller) prompt(w);
      });
    });
  });
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
}

// Skip link must not change the hash (hash = route).
document.querySelector(".skip-link")?.addEventListener("click", (e) => {
  e.preventDefault();
  const main = document.getElementById("main");
  (main.querySelector("h1") || main).focus();
});

buildNav();
offlineBar();
window.addEventListener("hashchange", route);
route();
registerSW();
cloud.init();
