// Theme: "auto" follows the OS; "light"/"dark" force it.
import { getState } from "./store.js";

const mq = window.matchMedia("(prefers-color-scheme: dark)");

export function applyTheme() {
  const pref = getState().settings.theme;
  const dark = pref === "dark" || (pref === "auto" && mq.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#0c0a09" : "#fafaf9");
}

mq.addEventListener("change", applyTheme);
