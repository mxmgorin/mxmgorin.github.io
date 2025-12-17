import { menu, Views } from "./content/views.js";
import { render } from "./render.js";

const routes = [
  { view: Views.ABOUT, key: null },
  { view: Views.PROJECTS, key: "projects" },
  { view: Views.CV, key: "cv" },
  { view: Views.CONTACT, key: "contact" },
];

function viewFromQuery() {
  const p = new URLSearchParams(window.location.search).get("p");
  return routes.find((r) => r.key === p)?.view ?? Views.ABOUT;
}

function indexFromQuery() {
  const p = new URLSearchParams(window.location.search).get("p");
  const i = routes.findIndex((r) => r.key === p);
  return i === -1 ? 0 : i;
}

function setQuery(key, replace = false) {
  const url = key ? `/?p=${key}` : "/";
  replace ? history.replaceState({}, "", url) : history.pushState({}, "", url);
}

export const state = {
  menuIndex: indexFromQuery(),
  view: viewFromQuery(),
};

export function moveUp() {
  state.menuIndex = Math.max(0, state.menuIndex - 1);
}

export function moveDown() {
  state.menuIndex = Math.min(menu.length - 1, state.menuIndex + 1);
}

export function select() {
  const key = routes[state.menuIndex]?.key;
  setQuery(key);
  state.view = routes[state.menuIndex].view;
  render();
}

window.addEventListener("popstate", () => {
  state.menuIndex = indexFromQuery();
  state.view = viewFromQuery();
  render();
});
