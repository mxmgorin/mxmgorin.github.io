// CRT visual effects (glow, scanlines, flicker) are defined in css/retro.css
// and switched off by the `no-crt` class on <html>. The *initial* state is
// applied by a tiny inline script in index.html, before first paint, so a
// "CRT off" visitor never sees a flash of effects. This module handles runtime
// toggling from the `crt` CLI command and persists the choice to localStorage.

const STORAGE_KEY = "crt";

export function isCrtOn() {
  return !document.documentElement.classList.contains("no-crt");
}

// Marks every CRT toggle pressed or not to match the current state.
export function syncCrtToggles() {
  const pressed = String(isCrtOn());
  document.querySelectorAll("[data-crt-toggle]").forEach((btn) => {
    btn.setAttribute("aria-pressed", pressed);
  });
}

export function setCrt(on) {
  document.documentElement.classList.toggle("no-crt", !on);
  syncCrtToggles();
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch (e) {
    /* ignore storage errors (private mode, quota, etc.) */
  }
}

// Resolves when the screen's running animation ends; at once if none runs.
export function screenAnimationsDone() {
  const tui = document.querySelector(".tui");
  return Promise.all(tui.getAnimations().map((a) => a.finished.catch(() => {})));
}

export function toggleCrt() {
  const next = !isCrtOn();
  setCrt(next);
  return next;
}
