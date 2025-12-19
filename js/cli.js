const output = document.getElementById("content");
const input = document.getElementById("command");

const commands = {
  help() {
    printCli(
      `Available commands:
- about
- cv
- contact
- clear
    `,
    );
  },

  about() {
    printCli(`about`);
  },

  cv() {
    printCli(`Available on request`);
  },

  clear() {
    output.innerHTML = "";
  },
};

function printCli(text) {
  const pre = document.createElement("pre");
  pre.textContent = text;
  output.appendChild(pre);
  output.scrollTop = output.scrollHeight;
}

export function focusCli() {
  input.focus();
}

export function blurCli(clear = false) {
  if (clear) input.value = "";
  input.blur();
}

export function isCliFocused() {
  return document.activeElement === input;
}

function execCommand() {
  const [commandRaw, ...args] = input.value.trim().split(/\s+/);
  const command = commandRaw.toLowerCase();
  const handler = commands[command];
  input.value = "";

  printCli(`\n> ${command}`);

  if (!handler) {
    printCli(`command not found: ${commandRaw}`);
    return;
  }

  handler(args);
}

document.getElementById("input-line").addEventListener("submit", (e) => {
  e.preventDefault();
  execCommand();
});
