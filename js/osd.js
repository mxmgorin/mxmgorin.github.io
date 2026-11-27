// On-screen menu: the monitor's settings drawn on the tube.
// Each row steps one setting through its values and applies it at once, through
// the same modules the CLI commands use. The menu stays open while it holds
// focus; Escape, a press outside it or focus moving elsewhere closes it.

import { Languages, setLang, state } from "./app.js";
import { isCrtOn, toggleCrt } from "./crt.js";
import { t } from "./i18n.js";
import { CASES, channelLabel, degauss, getCase, setCase } from "./monitor.js";
import { render } from "./render.js";
import { isSoundOn, playSound, toggleSound } from "./sound.js";
import { THEMES, getTheme, setTheme } from "./theme.js";

// A row without `value` is an action: any step runs it.
const ROWS = [
  {
    label: "osdTheme",
    value: () => t("themeNames")[getTheme()],
    step: (d) => setTheme(cycle(THEMES, getTheme(), d)),
  },
  {
    label: "osdCase",
    value: () => t("caseNames")[getCase()],
    step: (d) => setCase(cycle(CASES, getCase(), d)),
  },
  {
    label: "osdCrt",
    value: () => t(isCrtOn() ? "osdOn" : "osdOff"),
    step: toggleCrt,
  },
  {
    label: "osdSound",
    value: () => t(isSoundOn() ? "osdOn" : "osdOff"),
    step: toggleSound,
  },
  {
    label: "osdChannel",
    value: channelLabel,
    step: (d) => {
      setLang(cycle(Object.values(Languages), state.lang, d));
      render();
    },
  },
  { label: "osdDegauss", step: degauss },
];

// Elements that keep the menu open when pressed or focused.
const INSIDE = ".osd-menu, [data-menu]";

let active = 0;

export function isMenuOpen() {
  return !menuEl().hidden;
}

export function toggleMenu() {
  if (isMenuOpen()) {
    closeMenu();
  } else {
    openMenu();
  }
}

// Marks every menu key expanded or not to match the menu.
export function syncMenuButtons() {
  const open = String(isMenuOpen());
  document.querySelectorAll("[data-menu]").forEach((btn) => {
    btn.setAttribute("aria-expanded", open);
  });
}

// Handles a key press while the menu is open; returns true if it was spent.
export function handleMenuKey(e) {
  if (!isMenuOpen()) return false;

  switch (e.key) {
    case "ArrowUp":
      move(-1);
      break;
    case "ArrowDown":
      move(1);
      break;
    case "ArrowLeft":
      change(-1);
      break;
    case "ArrowRight":
    case "Enter":
    case " ":
      change(1);
      break;
    case "Escape":
      closeMenu();
      menuEl().blur();
      break;
    default:
      return false;
  }

  e.preventDefault();
  return true;
}

function openMenu() {
  const menu = menuEl();
  active = 0;
  menu.hidden = false;
  draw();
  menu.focus();
  syncMenuButtons();
  playSound("click");
  document.addEventListener("pointerdown", onPointerDown, true);
  menu.addEventListener("focusout", onFocusOut);
}

function closeMenu() {
  const menu = menuEl();
  if (menu.hidden) return;

  menu.hidden = true;
  syncMenuButtons();
  document.removeEventListener("pointerdown", onPointerDown, true);
  menu.removeEventListener("focusout", onFocusOut);
}

function onPointerDown(e) {
  if (!e.target.closest(INSIDE)) closeMenu();
}

// A blur with nowhere to go (a click on blank space) is left to onPointerDown.
function onFocusOut(e) {
  if (e.relatedTarget && !e.relatedTarget.closest(INSIDE)) closeMenu();
}

function move(d) {
  active = (active + d + ROWS.length) % ROWS.length;
  playSound("click");
  draw();
}

function change(d) {
  ROWS[active].step(d);
  playSound("click");
  draw();
}

function draw() {
  const menu = menuEl();
  menu.setAttribute("aria-label", t("osdTitle"));

  const title = document.createElement("p");
  title.className = "osd-title";
  title.textContent = t("osdTitle");

  const list = document.createElement("ul");
  ROWS.forEach((row, i) => {
    const li = document.createElement("li");
    li.id = `osd-row-${i}`;
    li.setAttribute("role", "menuitem");
    li.classList.toggle("active", i === active);

    const label = document.createElement("span");
    label.textContent = t(row.label);
    const value = document.createElement("span");
    value.className = "osd-value";
    value.textContent = row.value?.() ?? "";
    li.append(label, value);

    li.onclick = () => {
      active = i;
      change(1);
    };
    list.append(li);
  });

  const hint = document.createElement("p");
  hint.className = "osd-hint";
  hint.textContent = t("osdHint");

  menu.replaceChildren(title, list, hint);
  menu.setAttribute("aria-activedescendant", `osd-row-${active}`);
}

function menuEl() {
  return document.querySelector(".osd-menu");
}

// Returns the entry `step` places after `current` in `list`, wrapping around.
function cycle(list, current, step) {
  const i = list.indexOf(current);
  return list[(i + step + list.length) % list.length];
}
