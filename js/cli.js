import {
  render,
  newAbout,
  newProjects,
  newWork,
  newContact,
  newGame,
  renderElement,
  clearContent,
  newIntro,
} from "./render.js";
import { setLang } from "./app.js";

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
const HINTS = [
  "Type 'commands' to list all available commands.",
  "Use ↑ and ↓ to navigate command history.",
  "Type 'clear' to reset the screen.",
  "Try 'matrix' for a short visual effect.",
  "Press 'Esc' to exit the input. Press / or : to focus the command prompt.",
  "Using commands gives you more control and shortcuts.",
  // 'Tip: Type "help <command>" to learn more about a command.',
];
let hintQueue = [];

const MAX_HISTORY = 100;
const history = [];
let historyIndex = -1;
const commands = {
  help(args) {
    const flag = args[0];

    renderElement([
      "This is an optional command line interface.",
      "",
      "Try:",
      "-  about",
      "-  work",
      "-  hint",
      "-  matrix",
      "",
      "Type 'commands' to show all commands.",
      "Type 'clear' to reset the screen.",
    ]);
  },

  commands() {
    renderElement([
      "Available commands:",
      "",
      "Essential:",
      "  help            Show available commands",
      "  hint            Show a random tip",
      "  clear (clr)     Clear the current output",
      "",
      "View:",
      "  intro           Show intro text",
      "  about           Background and profile",
      "  projects        List personal and open-source projects",
      "  work            Professional experience",
      "  contact         Ways to get in touch",
      "  cv              Show CV availability (PDF)",
      "",
      "Interactive:",
      "  start <name>    Start an app (snake, tetris, invaders, breakout)",
      "  matrix          Show 'Matrix rain' animation",
      "",
      "Misc:",
      "  login <user>    Log in as the specified user",
      "  logout          Log out and return to guest",
      "  lang <code>     Change language",
    ]);
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

  work() {
    renderElement(newWork());
  },

  intro() {
    renderElement(newIntro());
  },

  cv() {
    renderElement([
      "Curriculum Vitae",
      "────────────────",
      "Available upon request (PDF).",
      "Feel free to use `contact` to ask for a copy.",
    ]);
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
      renderElement("Usage: login <user>");
      return;
    }

    if (USERS[user]) {
      enterPasswordMode(user);
      renderElement("Password:");
    } else {
      loginUser(user);
    }
  },

  logout() {
    state.user = "guest";
    updatePrompt();
    renderElement("Logout successful.");
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
      renderElement("Usage: lang <code>");
      return;
    }

    setLang(code);
    render();
  },

  hint() {
    if (hintQueue.length === 0) {
      hintQueue = [...HINTS].sort(() => Math.random() - 0.5);
    }
    const hint = hintQueue.pop();
    renderElement(`Tip: ${hint}`);
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
    renderElement([
      "Command not found.",
      "Type 'help' to see available commands.",
    ]);
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
    renderElement("Invalid password.");
  }
}

function loginUser(user) {
  state.user = user;
  updatePrompt();
  renderElement(`Welcome, '${user}'. Good to see you.`);
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
