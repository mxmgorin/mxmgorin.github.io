// Screen theme: the phosphor colour of the tube.
// The theme is one of THEMES, kept as `data-theme` on <html> and saved to
// localStorage. The saved choice is applied before first paint by a tiny inline
// script in index.html; this module handles runtime switching from the `theme`
// CLI command. Each name but the default has a matching block in css/base.css.

const STORAGE_KEY = "theme";

export const THEMES = ["green", "amber", "white"];
const DEFAULT_THEME = THEMES[0];

// Returns the theme in effect.
export function getTheme() {
  const current = document.documentElement.dataset.theme;
  return THEMES.includes(current) ? current : DEFAULT_THEME;
}

// Applies and saves a theme; returns false for an unknown name.
export function setTheme(name) {
  if (!THEMES.includes(name)) return false;

  document.documentElement.dataset.theme = name;
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch (e) {
    /* ignore storage errors (private mode, quota, etc.) */
  }
  return true;
}
