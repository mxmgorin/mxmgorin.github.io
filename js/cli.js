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
  'Type "help --all" to list all available commands.',
  // "Tip: Use ↑ and ↓ to navigate command history.",
  'Type "clear" to reset the screen.',
  'Try "matrix" for a short visual effect.',
  "Press Esc to exit the input. Press / or : to focus the command prompt.",
  "Using commands gives you more control and shortcuts.",
  // 'Tip: Type "help <command>" to learn more about a command.',
];
let hintQueue = [];
const commandEl = document.getElementById("command");
const promptEl = document.getElementById("prompt");
const commands = {
  help(args) {
    const flag = args[0];
    if (flag === "--a" || flag === "--all") {
      renderElement([
        "Available commands:",

        "",
        "Essential:",
        "  help            Show available commands",
        "  hint            Show a random tip",
        "  clear (clr)     Clear the current output",

        "",
        "Views:",
        "  intro           Show intro text",
        "  about           Background and profile",
        "  projects        List personal and open-source projects",
        "  work            Professional experience",
        "  contact         Ways to get in touch",
        "  cv              Show CV availability (PDF)",

        "",
        "Interactive:",
        "  start <name>    Start an app (snake, tetris, invaders, breakout)",
        "  matrix          Show Matrix rain animation",

        "",
        "Misc:",
        "  login <user>    Log in as the specified user",
        "  logout          Log out and return to guest",
        "  lang <code>     Change language",
      ]);
    } else {
      renderElement([
        "This is an optional command interface.",
        "",
        "Try:",
        "  about",
        "  work",
        "  matrix",
        "",
        "Type 'help --all' to show all commands.",
        "Type 'clear' to reset the screen.",
      ]);
    }
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
    const name = args[0];
    blurCli();
    renderElement(newGame(name));
  },

  matrix() {
    renderElement(newGame("matrix"));
  },

  snake() {
    renderElement(newGame("snake"));
  },

  tetris() {
    renderElement(newGame("tetris"));
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
  const [commandRaw, ...args] = commandEl.value.trim().split(/\s+/);
  const command = commandRaw.toLowerCase();
  const handler = commands[command];
  commandEl.value = "";

  renderElement(`\n> ${command}`);

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
    renderElement("Authentication failed.");
  }
}

function loginUser(user) {
  state.user = user;
  updatePrompt();
  renderElement("Login successful.");
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
