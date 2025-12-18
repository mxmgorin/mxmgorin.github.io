const output = document.getElementById("content");
const input = document.getElementById("command");

const commands = {
  help() {
    print(
      `Available commands:
- about
- cv
- contact
- clear
    `);
  },

  about() {
    print(`about`);
  },

  cv() {
    print(`Available on request`);
  },

  clear() {
    output.innerHTML = "";
  },
};

function print(text) {
  const pre = document.createElement("pre");
  pre.textContent = text;
  output.appendChild(pre);
  output.scrollTop = output.scrollHeight;
}

export function focusTerm() {
  console.log("focus");
  input.focus();
}

export function blurTerm(clear = false) {
  if (clear) input.value = "";
  input.blur();
}

export function isTermFocused() {
  return document.activeElement === input;
}

document.getElementById("input-line").addEventListener("submit", (e) => {
  e.preventDefault();

  const value = input.value.trim();
  input.value = "";

  print(`\n> ${value}`);

  const [cmd, ...args] = value.split(" ");
  if (commands[cmd]) {
    commands[cmd](args);
  } else {
    print(`Unknown command. Type 'help'.`);
  }
});
