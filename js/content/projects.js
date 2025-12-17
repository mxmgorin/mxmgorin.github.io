const projects = [
  {
    name: "Game Boy Emulator ",
    desc: "Cross-platform Game Boy emulator with a focus on accuracy, performance, and modern enhancements",
    url: "https://github.com/mxmgorin/gmboy",
    tags: ["Rust", "Emulation", "SDL2", "Android"],
  },
  {
    name: "CHIP-8 Virtual Machine",
    desc: "Multi-frontend CHIP-8, SCHIP, and XO-CHIP VM (emulator) with broad compatibility across variants, quirks support.",
    url: "https://mxmgorin.github.io/ch8go/web/",
    tags: ["Go", "WASM", "Emulation", "SDL2"],
  },
  {
    name: "Lua Interpreter",
    desc: "Exploring language internals by implementing a lexer, parser, and runtime.",
    url: "https://github.com/mxmgorin/luar",
    tags: ["Rust", "Lua"],
  },
  {
    name: "Web Browser",
    desc: "Experimenting with embedding the Servo engine.",
    url: "https://github.com/mxmgorin/retsurf",
    tags: [],
  },
  {
    name: "egui-sdl2",
    desc: "Library for integration between egui and sdl2.",
    url: "https://github.com/mxmgorin/egui-sdl2",
    tags: [],
  },
  {
    name: "Open Source",
    desc: "Contributor to PortMasterGames, where I ported several titles using Lua and Bash.",
    url: "https://portmaster.games/profile.html?porter=Troidem",
    tags: [],
  },
];

const separator = "-".repeat(40);

export function renderProjects(root) {
  const pre = document.createElement("pre");

  projects.forEach((p, i) => {
    pre.append(
      document.createTextNode(`${p.name}\n`),
      document.createTextNode(`  ${p.desc}\n`),
    );

    if (p.tags?.length) {
      pre.append(document.createTextNode(`  [${p.tags.join(" | ")}]\n`));
    }

    const a = document.createElement("a");
    a.href = p.url;
    a.textContent = p.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    pre.append(a, document.createTextNode("\n\n"));
    if (i < projects.length - 1) {
      pre.append(document.createTextNode(`${separator}\n`));
    }
  });

  root.appendChild(pre);
}
