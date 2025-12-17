import { menu, Views } from "./content/views.js";
import { render } from "./render.js";

const routes = [
  { view: Views.ABOUT, key: null },
  { view: Views.PROJECTS, key: "projects" },
  { view: Views.CV, key: "cv" },
  { view: Views.CONTACT, key: "contact" },
];

function setParam(name, value, replace = false) {
  const params = new URLSearchParams(window.location.search);

  if (value == null) {
    params.delete(name);
  } else {
    params.set(name, value);
  }

  const qs = params.toString();
  const url = qs ? `/?${qs}` : "/";

  replace ? history.replaceState({}, "", url) : history.pushState({}, "", url);
}

/* view navigation */
function getView() {
  const p = new URLSearchParams(window.location.search).get("v");
  return routes.find((r) => r.key === p)?.view ?? Views.ABOUT;
}

function getViewIndex() {
  const p = new URLSearchParams(window.location.search).get("v");
  const i = routes.findIndex((r) => r.key === p);
  return i === -1 ? 0 : i;
}

function setView(value, replace = false) {
  setParam("v", value);
}

/* lang handling */
export const Languages = {
  EN: "en",
  RU: "ru",
};
export const DEFAULT_LANG = Languages.EN;

function getLang() {
  const params = new URLSearchParams(window.location.search);
  return params.get("l") || DEFAULT_LANG;
}

function setLang(lang, replace = false) {
  setParam("l", value);
}

export const state = {
  menuIndex: getViewIndex(),
  view: getView(),
  lang: getLang(),
};

// debug helper
if (location.hostname === "localhost") {
  window.appState = state;
}

export function moveUp() {
  state.menuIndex = Math.max(0, state.menuIndex - 1);
}

export function moveDown() {
  state.menuIndex = Math.min(menu.length - 1, state.menuIndex + 1);
}

export function select() {
  const key = routes[state.menuIndex]?.key;
  setView(key);
  state.view = routes[state.menuIndex].view;
  render();
}

window.addEventListener("popstate", () => {
  state.menuIndex = getViewIndex();
  state.view = getView();
  render();
});
