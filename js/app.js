import { menu, Views } from "./content/views.js";
import { createInvadersApp } from "./games/invaders.js";
import { render } from "./render.js";
import { createSnakeApp } from "./games/snake.js";
import { createTetrisApp } from "./games/tetris.js";
import { createBreakoutApp } from "./games/breakout.js";

export let gameApp = null;
export const Languages = {
  EN: "en",
  RU: "ru",
};
export var state = {};
export const DEFAULT_LANG = Languages.EN;
const BASE_TITLE = "mxmgorin.dev | Web TUI";
const routes = [
  { view: Views.ABOUT, key: "about" },
  { view: Views.PROJECTS, key: "projects" },
  { view: Views.WORK, key: "work" },
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
function getLang() {
  const params = new URLSearchParams(window.location.search);
  return params.get("l") || DEFAULT_LANG;
}

export function setLang(lang, replace = false) {
  setParam("l", lang);
  state.lang = lang;
}

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
  const route = routes[state.menuIndex]?.key;
  setView(route);
  setTitle(route);
  state.view = routes[state.menuIndex].view;
  render();
}

function setTitle(route) {
  if (!route) {
    document.title = BASE_TITLE;
    return;
  }

  document.title = `${BASE_TITLE}: ${route.toUpperCase()}`;
}

export function startGame(screen, name, exitCallback) {
  const history = screen.textContent;

  switch (name ?? "invaders") {
    case "snake": {
      gameApp = createSnakeApp(screen, { history });
      break;
    }
    case "tetris": {
      gameApp = createTetrisApp(screen, { history });
      break;
    }
    case "invaders": {
      gameApp = createInvadersApp(screen, { history });
      break;
    }
    case "breakout": {
      gameApp = createBreakoutApp(screen, { history });
      break;
    }
    default: {
      return false;
    }
  }

  state.mode = "game";
  gameApp.start(() => {
    state.mode = "tui";
    gameApp = null;
    if (exitCallback) exitCallback();
  });

  return true;
}

export function setupApp() {
  state.menuIndex = getViewIndex();
  state.view = getView();
  state.lang = getLang();
  state.mode = "tui";

  setTitle();

  window.addEventListener("popstate", () => {
    state.menuIndex = getViewIndex();
    state.view = getView();
    render();
  });
}
