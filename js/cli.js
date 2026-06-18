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
  newCommandSuggestions,
} from "./render.js";
import { setLang, openPost, Languages, state as appState } from "./app.js";
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

// Tux, rendered beside the neofetch info card.
const NEOFETCH_ART = [
  "    .--.",
  "   |o_o |",
  "   |:_/ |",
  "  //   \\ \\",
  " (|     | )",
  "/'\\_   _/`\\",
  "\\___)=(___/",
];

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

  neofetch() {
    const info = t("neofetchInfo", state.user);
    const width = Math.max(...NEOFETCH_ART.map((l) => l.length)) + 2;
    const rows = Math.max(NEOFETCH_ART.length, info.length);
    const lines = [];
    for (let i = 0; i < rows; i++) {
      lines.push((NEOFETCH_ART[i] ?? "").padEnd(width) + (info[i] ?? ""));
    }
    renderElement(lines);
  },

  whoami() {
    renderElement(state.user);
  },

  pwd() {
    renderElement(`/home/${state.user}`);
  },

  ls() {
    renderElement(
      newCommandSuggestions("", ["about", "projects", "blog", "contact", "cv"]),
    );
  },

  cat(args) {
    const target = args[0];
    if (!target) {
      renderElement(t("catUsage"));
      return;
    }
    switch (target) {
      case "about":
        renderElement(newAbout());
        break;
      case "projects":
        renderElement(newProjects());
        break;
      case "contact":
        renderElement(newContact());
        break;
      case "blog":
        renderElement(newBlogList());
        break;
      default:
        renderElement(t("catNoSuch", target));
    }
  },

  uname() {
    renderElement(t("uname"));
  },

  date() {
    const locale = appState.lang === "ru" ? "ru-RU" : "en-US";
    renderElement(new Date().toLocaleString(locale));
  },

  echo(args) {
    renderElement(args.join(" "));
  },

  history() {
    if (!history.length) {
      renderElement(t("historyEmpty"));
      return;
    }
    renderElement(history.map((c, i) => `  ${i + 1}  ${c}`));
  },

  sudo() {
    renderElement(t("sudo"));
  },

  exit() {
    renderElement(t("exitMsg"));
    blurCli();
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
  runCommand(value);
}

// Execute a command line as if typed: echo it, record history, dispatch.
// Exported so clickable command links (data-cmd) can run commands too.
export function runCommand(value) {
  if (!value) return;

  renderElement(`\n> ${value}`);
  addToHistory(value);

  const [commandRaw, ...args] = value.split(/\s+/);
  const command = commandRaw.toLowerCase();
  const handler = commands[command];

  if (!handler) {
    renderElement(t("commandNotFound"));
    const suggestion = closestCommand(command);
    if (suggestion) {
      renderElement(newCommandSuggestions(t("didYouMean"), [suggestion]));
    }
    return;
  }

  handler(args);
}

// Tab-completion sources for command arguments, keyed by command name.
const ARG_COMPLETERS = {
  read: () => blogView.map((p) => p.slug),
  start: () => ["snake", "tetris", "invaders", "breakout"],
  lang: () => Object.values(Languages),
};

// Complete the current input in place: commands when no argument is being
// typed yet, otherwise the active command's argument values. On an ambiguous
// match it fills the shared prefix and lists the candidates, like a real shell.
function autocomplete() {
  const value = commandEl.value;
  if (!value) return;

  const trailingSpace = /\s$/.test(value);
  const parts = value.split(/\s+/).filter(Boolean);
  const completingArg = parts.length > 1 || trailingSpace;

  let prefix, partial, pool;
  if (!completingArg) {
    prefix = "";
    partial = parts[0] ?? "";
    pool = Object.keys(commands);
  } else {
    const provider = ARG_COMPLETERS[parts[0]];
    if (!provider) return;
    prefix = `${parts[0]} `;
    partial = trailingSpace ? "" : parts[parts.length - 1];
    pool = provider();
  }

  const matches = pool.filter((c) => c.startsWith(partial));
  if (matches.length === 0) return;

  if (matches.length === 1) {
    commandEl.value = `${prefix}${matches[0]} `;
    return;
  }

  const common = commonPrefix(matches);
  if (common.length > partial.length) commandEl.value = prefix + common;
  renderElement(matches.join("    ")); // show the options
}

function commonPrefix(strs) {
  let p = strs[0] ?? "";
  for (const s of strs) {
    while (!s.startsWith(p)) p = p.slice(0, -1);
    if (!p) break;
  }
  return p;
}

// Closest command by edit distance, for "did you mean" hints. Returns null if
// nothing is within a small threshold (so we don't suggest unrelated commands).
function closestCommand(input) {
  let best = null;
  let bestDist = Infinity;
  for (const name of Object.keys(commands)) {
    const dist = levenshtein(input, name);
    if (dist < bestDist) {
      bestDist = dist;
      best = name;
    }
  }
  return bestDist <= 2 ? best : null;
}

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[a.length][b.length];
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

    if (e.key === "Tab") {
      e.preventDefault();
      autocomplete();
    }
  });

  // Clickable command links (welcome row, ls, did-you-mean) run the command.
  document.getElementById("content").addEventListener("click", (e) => {
    const link = e.target.closest("a.cmd-link");
    if (!link) return;
    e.preventDefault();
    runCommand(link.dataset.cmd);
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
