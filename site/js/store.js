// Persistent app state (localStorage) + change notifications.
import { migrate, syncHearts } from "./game.js";

const KEY = "gq.v1";
let state = load();
const listeners = new Set();

function load() {
  try {
    return migrate(JSON.parse(localStorage.getItem(KEY) || "null"));
  } catch {
    return migrate(null);
  }
}

export function getState() {
  return state;
}

/** Mutate state via fn(state), persist, notify. */
export function update(fn) {
  fn(state);
  save();
  for (const l of listeners) l(state);
}

export function replaceState(next) {
  state = migrate(next);
  save();
  for (const l of listeners) l(state);
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("save failed", e);
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Refresh hearts regeneration (call on screen render). */
export function tickHearts() {
  const before = state.hearts.n;
  syncHearts(state);
  if (state.hearts.n !== before) save();
  return state.hearts.n;
}

// Keep tabs in sync: another tab saved → reload state.
window.addEventListener("storage", (e) => {
  if (e.key === KEY) {
    state = load();
    for (const l of listeners) l(state);
  }
});
