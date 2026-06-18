import {
  render,
  newAbout,
  newProjects,
  newContact,
  newGame,
  renderElement,
  clearContent,
  newIntro,
  newBlogList,
} from "./render.js";
import { setLang, openPost } from "./app.js";
import { blogView } from "./content/blog.js";
import { t } from "./i18n.js";

const commandEl = document.getElementById("command");
const promptEl = document.getElementById("prompt");

var state = {
  user: "guest",
  mode: "command", // "command" | "password",
  loginUser: null,
};
const USERS = {
  admin: {
    password: "admin",
  },
};
let hintQueue = [];

const MAX_HISTORY = 100;
const history = [];
let historyIndex = -1;
const commands = {
  help() {
    renderElement(t("cliHelp"));
  },

  commands() {
    renderElement(t("cliCommands"));
  },

  about() {
    renderElement(newAbout());
  },

  contact() {
    renderElement(newContact());
  },

  projects() {
    renderElement(newProjects());
  },

  blog() {
    renderElement(newBlogList());
  },

  read(args) {
    const ref = args[0];

    if (!ref) {
      renderElement(t("readUsage"));
      return;
    }

    const n = Number(ref);
    const post = Number.isInteger(n)
      ? blogView[n - 1]
      : blogView.find((p) => p.slug === ref);

    if (!post) {
      renderElement(t("noPost", ref));
      return;
    }

    openPost(post.slug);
  },

  intro() {
    renderElement(newIntro());
  },

  cv() {
    renderElement(t("cv"));
  },

  clear() {
    clearContent();
  },

  clr() {
    clearContent();
  },

  login(args) {
    const user = args[0];

    if (!user) {
      renderElement(t("loginUsage"));
      return;
    }

    if (USERS[user]) {
      enterPasswordMode(user);
      renderElement(t("passwordPrompt"));
    } else {
      loginUser(user);
    }
  },

  logout() {
    state.user = "guest";
    updatePrompt();
    renderElement(t("logoutSuccess"));
  },

  start(args) {
    startGame(args);
  },

  matrix() {
    startGame(["matrix"]);
  },

  snake() {
    startGame(["snake"]);
  },

  tetris() {
    startGame(["tetris"]);
  },

  invaders() {
    startGame(["invaders"]);
  },

  breakout() {
    startGame(["breakout"]);
  },

  lang(args) {
    const code = args[0];

    if (!code) {
      renderElement(t("langUsage"));
      return;
    }

    setLang(code);
    render();
  },

  hint() {
    if (hintQueue.length === 0) {
      hintQueue = [...t("hints")].sort(() => Math.random() - 0.5);
    }
    const hint = hintQueue.pop();
    renderElement(t("tip", hint));
  },
};

export function focusCli() {
  commandEl.focus();
}

export function blurCli(clear = false) {
  if (clear) commandEl.value = "";
  commandEl.blur();
}

export function isCliFocused() {
  return document.activeElement === commandEl;
}

function handleCommand() {
  const value = commandEl.value.trim();
  commandEl.value = "";

  renderElement(`\n> ${value}`);
  addToHistory(value);

  const [commandRaw, ...args] = value.split(/\s+/);
  const command = commandRaw.toLowerCase();
  const handler = commands[command];

  if (!handler) {
    renderElement(t("commandNotFound"));
    return;
  }

  handler(args);
}

export function setupCli() {
  updatePrompt();

  document.getElementById("input-line").addEventListener("submit", (e) => {
    e.preventDefault();

    if (state.mode === "password") {
      handlePassword();
    } else {
      handleCommand();
    }
  });

  commandEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      showPrevCommand();
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      showNextCommand();
    }
  });
}

function updatePrompt() {
  const symbol = state.user === "admin" ? "#" : "$";
  promptEl.textContent = `${state.user}:~${symbol}`;
}

function handlePassword() {
  const password = commandEl.value;
  const user = state.loginUser;
  exitPasswordMode();

  if (password === USERS[user]?.password) {
    loginUser(user);
  } else {
    renderElement(t("invalidPassword"));
  }
}

function loginUser(user) {
  state.user = user;
  updatePrompt();
  renderElement(t("welcomeUser", user));
}

function enterPasswordMode(user) {
  state.loginUser = user;
  state.mode = "password";
  commandEl.type = "password";
  commandEl.autocomplete = "new-password";
}

function exitPasswordMode() {
  state.mode = "command";
  commandEl.type = "text";
  commandEl.autocomplete = "off";
  commandEl.value = "";
}

function showPrevCommand() {
  if (!history.length) return;

  historyIndex = Math.max(0, historyIndex - 1);
  commandEl.value = history[historyIndex];
}

function showNextCommand() {
  if (!history.length) return;

  historyIndex = Math.min(history.length, historyIndex + 1);
  commandEl.value = history[historyIndex] ?? "";
}

function addToHistory(command) {
  if (!command) return;

  // Avoid consecutive duplicates
  if (history[history.length - 1] === command) return;

  history.push(command);

  if (history.length > MAX_HISTORY) {
    history.shift(); // remove oldest
  }

  historyIndex = history.length;
}

function startGame(args) {
  const name = args[0];
  blurCli();
  renderElement(newGame(name));
}
