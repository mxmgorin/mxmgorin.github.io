import { startGame } from "./app.js";
import {
  renderAbout,
  renderProjects,
  renderWork,
  renderContact,
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
const outputEl = document.getElementById("content");
const inputEl = document.getElementById("command");
const promptEl = document.getElementById("prompt");
const commands = {
  help() {
    printCli([
      "Available commands:",
      "help            Show available commands",
      "clear (clr)     Clear the current output",
      "game <name>     Start a game: 'snake'",
      "cv              Show CV availability (PDF)",
      "login <user>    Log in as the specified user",
      "about           Background and profile",
      "projects        List personal and open-source projects",
      "work            Professional experience",
      "contact         Ways to get in touch",
    ]);
  },

  about() {
    printCli(renderAbout());
  },

  contact() {
    printCli(renderContact());
  },

  projects() {
    printCli(renderProjects());
  },

  work() {
    printCli(renderWork());
  },

  cv() {
    printCli([
      "Curriculum Vitae",
      "────────────────",
      "Available upon request (PDF).",
      "Feel free to use `contact` to ask for a copy.",
    ]);
  },

  clear() {
    outputEl.innerHTML = "";
  },

  clr() {
    outputEl.innerHTML = "";
  },

  login(args) {
    const user = args[0];

    if (!user) {
      printCli("Usage: login <user>");
      return;
    }

    enterPasswordMode(user);

    printCli("Password:");
  },

  game() {
    startGame();
    outputEl.scrollTop = outputEl.scrollHeight;
  },
};

function printCli(value) {
  let node;

  if (value instanceof Node) {
    node = value;
  } else {
    const pre = document.createElement("pre");
    pre.textContent = Array.isArray(value) ? value.join("\n") : value;
    node = pre;
  }

  outputEl.appendChild(node);
  outputEl.scrollTop = outputEl.scrollHeight;
}

export function focusCli() {
  inputEl.focus();
}

export function blurCli(clear = false) {
  if (clear) inputEl.value = "";
  inputEl.blur();
}

export function isCliFocused() {
  return document.activeElement === inputEl;
}

function handleCommand() {
  const [commandRaw, ...args] = inputEl.value.trim().split(/\s+/);
  const command = commandRaw.toLowerCase();
  const handler = commands[command];
  inputEl.value = "";

  printCli(`\n> ${command}`);

  if (!handler) {
    printCli(`command not found: ${commandRaw}`);
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
  promptEl.textContent = `${state.user}:~$`;
}

function handlePassword() {
  const password = inputEl.value;
  const user = state.loginUser;

  exitPasswordMode();

  if (password === USERS[user]?.password) {
    state.user = user;
    updatePrompt();
    printCli("Login successful.");
  } else {
    printCli("Authentication failed.");
  }
}

function enterPasswordMode(user) {
  state.loginUser = user;
  state.mode = "password";
  inputEl.type = "password";
  inputEl.autocomplete = "new-password";
}

function exitPasswordMode() {
  state.mode = "command";
  inputEl.type = "text";
  inputEl.autocomplete = "off";
  inputEl.value = "";
}
