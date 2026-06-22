// CRT visual effects (glow, scanlines, flicker) are defined in css/retro.css
// and switched off by the `no-crt` class on <html>. The *initial* state is
// applied by a tiny inline script in index.html, before first paint, so a
// "CRT off" visitor never sees a flash of effects. This module handles runtime
// toggling from the `crt` CLI command and persists the choice to localStorage.

const STORAGE_KEY = "crt";

export function isCrtOn() {
  return !document.documentElement.classList.contains("no-crt");
}

export function setCrt(on) {
  document.documentElement.classList.toggle("no-crt", !on);
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch (e) {
    /* ignore storage errors (private mode, quota, etc.) */
  }
}

export function toggleCrt() {
  const next = !isCrtOn();
  setCrt(next);
  return next;
}
