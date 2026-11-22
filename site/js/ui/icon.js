// Inline SVG icons — Material Symbols Rounded (Google Fonts, Apache 2.0).
import { ICONS } from "../icons-data.js";

const NS = "http://www.w3.org/2000/svg";

/**
 * icon("school") → decorative <svg aria-hidden="true">.
 * icon("favorite", { fill: true, label: "หัวใจ" }) → meaningful icon with role="img".
 */
export function icon(name, { fill = false, label = "", size = "", cls = "" } = {}) {
  const key = fill && ICONS[name + "-fill"] ? name + "-fill" : name;
  const d = ICONS[key];
  if (!d) throw new Error("Unknown icon: " + name);
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 -960 960 960");
  svg.setAttribute("class", ["icon", size && "icon-" + size, cls].filter(Boolean).join(" "));
  svg.setAttribute("focusable", "false");
  if (label) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
  } else {
    svg.setAttribute("aria-hidden", "true");
  }
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", d);
  svg.append(p);
  return svg;
}
