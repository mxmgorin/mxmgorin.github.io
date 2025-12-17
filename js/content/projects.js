const projects = [
  {
    name: "Game Boy Emulator ",
    desc: "Cross-platform Game Boy emulator with a focus on accuracy, performance, and modern enhancements",
    url: "https://github.com/mxmgorin/gmboy",
    tags: ["Rust", "Emulation", "SDL2", "OpenGL", "Android", "Desktop"],
  },
  {
    name: "CHIP-8 Virtual Machine",
    desc: "Multi-frontend CHIP-8, SCHIP, and XO-CHIP VM (emulator) with broad compatibility across variants and quirks support",
    url: "https://mxmgorin.github.io/ch8go/web/",
    tags: ["Go", "WASM", "Emulation", "SDL2"],
  },
  {
    name: "Lua Interpreter",
    desc: "Exploring language internals by implementing a lexer, parser, and runtime",
    url: "https://github.com/mxmgorin/luar",
    tags: ["Rust", "Lua"],
  },
  {
    name: "Web Browser",
    desc: "Lightweight web browser built using Servo engine and designed for retro and low-resource systems",
    url: "https://github.com/mxmgorin/retsurf",
    tags: ["Rust", "Web"],
  },
  {
    name: "egui-sdl2",
    desc: "Library that integrates egui with SDL2, providing input handling and rendering backends",
    url: "https://github.com/mxmgorin/egui-sdl2",
    tags: ["Rust", "GUI", "SDL2", "OpenGL"],
  },
  {
    name: "Open Source",
    desc: "Contributor to PortMaster Games, porting several titles for ARM-based Linux handheld systems",
    url: "https://portmaster.games/profile.html?porter=Troidem",
    tags: ["Lua", "Bash", "GameDev"],
  },
];

const separator = " ".repeat(1);

export function renderProjects(root) {
  const pre = document.createElement("pre");

  projects.forEach((p, i) => {
    const name = document.createElement("strong");
    name.textContent = p.name;

    pre.append(name);

    if (p.url) {
      pre.append(document.createTextNode(" "));

      const link = document.createElement("a");
      link.href = p.url;
      link.textContent = "[link]";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Open ${p.name} project`);

      pre.append(link);
    }
    pre.append(
      document.createTextNode("\n"),
      document.createTextNode(`  ${p.desc}\n`),
    );

    if (p.tags?.length) {
      const tags = document.createElement("span");
      tags.className = "tags";
      tags.textContent = `  [${p.tags.join(" | ")}]`;

      pre.append(tags, document.createTextNode("\n"));
    }

    if (i < projects.length - 1) {
      pre.append(document.createTextNode(`${separator}\n`));
    }
  });

  root.appendChild(pre);
}
