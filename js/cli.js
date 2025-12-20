import {
  newAbout,
  newProjects,
  newWork,
  newContact,
  newGame,
  renderElement,
  clearContent,
} from "./render.js";

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

const commandEl = document.getElementById("command");
const promptEl = document.getElementById("prompt");
const commands = {
  help() {
    renderElement([
      "Available commands:",
      "help            Show available commands",
      "clear (clr)     Clear the current output",
      "play <name>     Start a game: snake, tetris, invaders, breakout",
      "matrix          'Matrix rain' animation",
      "cv              Show CV availability (PDF)",
      "login <user>    Log in as the specified user",
      "logout          Log out the current user and return to guest",
      "about           Background and profile",
      "projects        List personal and open-source projects",
      "work            Professional experience",
      "contact         Ways to get in touch",
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

    enterPasswordMode(user);
    renderElement("Password:");
  },

  logout() {
    state.user = "guest";
    updatePrompt();
    renderElement("Logout successful.");
  },

  play(args) {
    const name = args[0];
    blurCli();
    renderElement(newGame(name));
  },

  matrix() {
    renderElement(newGame("matrix"));
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
    renderElement(`command not found: ${commandRaw}`);
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
    state.user = user;
    updatePrompt();
    renderElement("Login successful.");
  } else {
    renderElement("Authentication failed.");
  }
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
