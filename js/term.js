const output = document.getElementById("output");
const input = document.getElementById("command");

const commands = {
  help() {
    print(`
Available commands:
- about
- projects
- skills
- cv
- contact
- clear
    `);
  },

  about() {
    print(`
Maksym Horin
------------
Systems-focused developer with an emphasis on emulation,
low-level software, and correctness-oriented design.

Primary interests:
- Emulator development (CHIP-8, Game Boy)
- Rust, Go
- Testing, documentation, architecture
    `);
  },

  projects() {
    print(`
Projects:
- CHIP-8 Emulator
- Game Boy Emulator
Type: project <name>
    `);
  },

  cv() {
    print(`Download CV: <a href="cv.pdf">cv.pdf</a>`);
  },

  clear() {
    output.innerHTML = "";
  },
};

function print(text) {
  const pre = document.createElement("pre");
  pre.innerHTML = text.trim();
  output.appendChild(pre);
  output.scrollTop = output.scrollHeight;
}

document.getElementById("input-line").addEventListener("submit", (e) => {
  e.preventDefault();

  const value = input.value.trim();
  input.value = "";

  print(`> ${value}`);

  const [cmd, ...args] = value.split(" ");
  if (commands[cmd]) {
    commands[cmd](args);
  } else {
    print(`Unknown command. Type 'help'.`);
  }
});
