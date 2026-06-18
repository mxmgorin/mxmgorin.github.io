import { homeView, menu, Views } from "./content/views.js";
import { createInvadersApp } from "./games/invaders.js";
import { render } from "./render.js";
import { createSnakeApp } from "./games/snake.js";
import { createTetrisApp } from "./games/tetris.js";
import { createBreakoutApp } from "./games/breakout.js";
import { createMatrixApp } from "./games/matrix.js";
import { t } from "./i18n.js";

export let gameApp = null;
export const Languages = {
  EN: "en",
  RU: "ru",
};
export var state = {};
export const DEFAULT_LANG = Languages.EN;
const BASE_TITLE = "mxmgorin.dev | Web TUI";
const routes = [
  // { view: Views.INTRO, key: "intro" },
  { view: Views.ABOUT, key: "about" },
  { view: Views.PROJECTS, key: "projects" },
  { view: Views.BLOG, key: "blog" },
  { view: Views.CONTACT, key: "contact" },
];

function setParam(name, value, replace = false) {
  setParams({ [name]: value }, replace);
}

function setParams(updates, replace = false) {
  const params = new URLSearchParams(window.location.search);

  for (const [name, value] of Object.entries(updates)) {
    if (value == null) {
      params.delete(name);
    } else {
      params.set(name, value);
    }
  }

  const qs = params.toString();
  const url = qs ? `/?${qs}` : "/";

  replace ? history.replaceState({}, "", url) : history.pushState({}, "", url);
}

/* view navigation */
function getView() {
  const p = new URLSearchParams(window.location.search).get("v");
  return routes.find((r) => r.key === p)?.view ?? homeView;
}

function getViewIndex() {
  const p = new URLSearchParams(window.location.search).get("v");
  // -1 (no highlight) on the home view, where no page is selected.
  return routes.findIndex((r) => r.key === p);
}

/* blog post navigation */
function getPost() {
  return new URLSearchParams(window.location.search).get("post");
}

const blogIndex = routes.findIndex((r) => r.key === "blog");

export function openPost(slug) {
  state.post = slug;
  state.view = Views.BLOG;
  state.menuIndex = blogIndex;
  setParams({ v: "blog", post: slug });
  setTitle("blog");
  render();
}

export function openBlogList() {
  state.post = null;
  state.view = Views.BLOG;
  state.menuIndex = blogIndex;
  setParams({ v: "blog", post: null });
  setTitle("blog");
  render();
}

// Navigate to the home view (clean console + neofetch), clearing the URL.
export function openHome() {
  state.post = null;
  state.menuIndex = -1;
  state.projectTag = null;
  state.blogTag = null;
  state.view = homeView;
  setParams({ v: null, post: null });
  setTitle();
  render();
}

// Navigate to a top-level view by its route key (used by in-site links).
// `tag` pre-applies a filter when opening the projects or blog view.
export function openView(key, { tag = null } = {}) {
  const i = routes.findIndex((r) => r.key === key);
  if (i === -1) return;

  state.menuIndex = i;
  state.view = routes[i].view;
  state.post = null;
  state.projectTag = key === "projects" ? tag : null;
  state.blogTag = key === "blog" ? tag : null;
  setParams({ v: key, post: null });
  setTitle(key);
  render();
}

// Filter the projects view by a tag (null shows all). Transient, not in the URL.
export function filterProjects(tag) {
  state.projectTag = tag;
  render();
}

// Filter the blog list by a tag (null shows all). Transient, not in the URL.
export function filterBlog(tag) {
  state.blogTag = tag;
  render();
}

/* lang handling */
function getLang() {
  const params = new URLSearchParams(window.location.search);
  return params.get("l") || DEFAULT_LANG;
}

export function setLang(lang, replace = false) {
  setParam("l", lang);
  state.lang = lang;
  // keep the document title in the new language (render() handles the rest)
  setTitle(routes.find((r) => r.view === state.view)?.key);
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
  // On the home view nothing is highlighted (menuIndex === -1); default to the
  // first menu item so pressing Enter still navigates somewhere sensible.
  const i = state.menuIndex < 0 ? 0 : state.menuIndex;
  state.menuIndex = i;
  state.post = null;
  state.projectTag = null;
  state.blogTag = null;
  setParams({ v: routes[i].key, post: null });
  setTitle(routes[i].key);
  state.view = routes[i].view;
  render();
}

function setTitle(route) {
  if (!route) {
    document.title = BASE_TITLE;
    return;
  }

  document.title = `${BASE_TITLE}: ${t(`menu.${route}`).toUpperCase()}`;
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
    case "matrix": {
      gameApp = createMatrixApp(screen, { history });
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
  state.post = state.view === Views.BLOG ? getPost() : null;
  state.lang = getLang();
  state.mode = "tui";

  setTitle();

  window.addEventListener("popstate", () => {
    state.menuIndex = getViewIndex();
    state.view = getView();
    state.post = state.view === Views.BLOG ? getPost() : null;
    state.projectTag = null;
    state.blogTag = null;
    render();
  });

  // The "mxmgorin.dev" header acts as a home link (clean console + neofetch).
  const status = document.querySelector(".tui-header .status");
  if (status) {
    status.addEventListener("click", (e) => {
      e.preventDefault();
      openHome();
    });
  }

  // Re-render when the viewport crosses the phone breakpoint so width-dependent
  // layouts (e.g. the neofetch card) switch between side-by-side and stacked.
  const narrow = window.matchMedia("(max-width: 700px)");
  let wasNarrow = narrow.matches;
  window.addEventListener("resize", () => {
    if (narrow.matches !== wasNarrow) {
      wasNarrow = narrow.matches;
      render();
    }
  });
}
