// Monitor controls: the case colour and the degauss coil.
// The case colour is one of CASES, kept as `data-case` on <html> and saved
// to localStorage. The saved choice is applied before first paint by a tiny
// inline script in index.html; this module handles runtime switching from the
// `case` CLI command. Each name has a matching colour block in css/monitor.css.
// Degaussing sets `degaussing` on <html> for css/retro.css to animate.

import { isCrtOn, screenAnimationsDone } from "./crt.js";
import { playSound } from "./sound.js";

const STORAGE_KEY = "case";

export const CASES = ["olive", "graphite", "black", "taupe", "platinum"];
const DEFAULT_CASE = CASES[0];

// Returns the case colour in effect.
export function getCase() {
  const current = document.documentElement.dataset.case;
  return CASES.includes(current) ? current : DEFAULT_CASE;
}

// Applies and saves a case colour; returns false for an unknown name.
export function setCase(name) {
  if (!CASES.includes(name)) return false;

  document.documentElement.dataset.case = name;
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch (e) {
    /* ignore storage errors (private mode, quota, etc.) */
  }
  return true;
}

// Checks whether the viewport currently shows the case.
export function isCaseShown() {
  const monitor = document.querySelector(".monitor");
  return monitor !== null && getComputedStyle(monitor).display !== "contents";
}

// Wobbles the picture while the tube demagnetises; returns false on a flat panel.
export async function degauss() {
  if (!isCrtOn()) return false;

  const root = document.documentElement;
  if (root.classList.contains("degaussing")) return true;

  playSound("degauss");
  root.classList.add("degaussing");
  await screenAnimationsDone();
  root.classList.remove("degaussing");
  return true;
}
