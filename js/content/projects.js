// Each project can list multiple labeled links. A link with `view` navigates
// inside the site (e.g. to the blog); otherwise `url` opens in a new tab.

// Tags shown in the projects filter bar. Cards still display every tag; these
// are just the headline filters worth surfacing.
export const mainTags = ["Rust", "Go", "C#", "Lua"];

export const projects = [
  {
    name: "GMBoy",
    desc: {
      en: "My first emulator and one of my longest-running projects. It started as an attempt to understand how the Game Boy works under the hood and gradually evolved into a cross-platform emulator focused on accuracy and performance.",
      ru: "Мой первый эмулятор и проект, к которому я постоянно возвращаюсь. Начинался как попытка разобраться в устройстве Game Boy, а со временем вырос в кроссплатформенный эмулятор с упором на точность и производительность.",
    },
    links: [{ label: "source", url: "https://github.com/mxmgorin/gmboy" }],
    tags: ["Rust", "Emulation", "SDL2", "OpenGL", "Android", "Desktop"],
  },
  {
    name: "retsurf",
    desc: {
      en: "It felt odd that modern retro handhelds come with Wi-Fi and capable graphics hardware, yet still lack a decent web browser. So I built one. The browser uses Servo for rendering modern websites, SDL2 and egui for a gamepad-friendly user interface, and is written entirely in Rust.",
      ru: "У современных ретро-консолей есть Wi-Fi, GPU и вполне приличное железо, но нормального браузера для них практически нет. Этот проект — попытка исправить ситуацию. За отображение страниц отвечает Servo, а SDL2 и egui обеспечивают интерфейс и управление с геймпада.",
    },
    links: [
      { label: "source", url: "https://github.com/mxmgorin/retsurf" },
      { label: "posts", view: "blog", tag: "Servo" },
    ],
    tags: ["Rust", "Web"],
  },
  {
    name: "ch8go",
    desc: {
      en: "I started this project to get hands-on experience with Go. It eventually grew into a multi-frontend CHIP-8, SCHIP, and XO-CHIP emulator, while teaching me just how many incompatible variations and quirks have accumulated throughout the platform's history.",
      ru: "Начинал этот проект, чтобы как следует освоить Go. В итоге получил мультифронтендный эмулятор CHIP-8, SCHIP и XO-CHIP и гораздо лучшее понимание того, насколько запутанной может быть история платформы с десятками несовместимых вариаций.",
    },
    links: [
      { label: "demo", url: "https://mxmgorin.github.io/ch8go/web/" },
      { label: "source", url: "https://github.com/mxmgorin/ch8go" },
      { label: "posts", view: "blog", tag: "CHIP-8" },
    ],
    tags: ["Go", "Emulation", "WASM", "CLI", "SDL2"],
  },
  {
    name: "PortMaster",
    desc: {
      en: "One of my favorite open-source activities is porting games to ARM Linux handhelds as a contributor to PortMaster, helping bring games to devices they were never originally designed for.",
      ru: "Одно из моих любимых open-source занятий — портировать игры на портативные ARM Linux-консоли в рамках проекта PortMaster и делать их доступными на устройствах, для которых они изначально не предназначались.",
    },
    links: [
      { label: "profile", url: "https://portmaster.games/profile.html?porter=Troidem" },
    ],
    tags: ["Lua", "Bash", "GameDev"],
  },
  {
    name: "egui-sdl2",
    desc: {
      en: "A small library that grew out of my own projects. It bridges egui and SDL2, providing input handling and multiple rendering backends to make embedding egui interfaces into SDL2 applications straightforward.",
      ru: "Небольшая библиотека, выросшая из моих собственных проектов. Она связывает egui и SDL2, предоставляя обработку ввода и несколько бэкендов рендеринга, чтобы интерфейсы на egui можно было легко встраивать в SDL2-приложения.",
    },
    links: [{ label: "source", url: "https://github.com/mxmgorin/egui-sdl2" }],
    tags: ["Rust", "GUI", "SDL2", "OpenGL"],
  },
  {
    name: "csbf",
    desc: {
      en: "A Brainfuck interpreter, debugger, and recompiling compiler written in C#. Originally created to explore different execution strategies, from straightforward interpretation to runtime recompilation.",
      ru: "Интерпретатор, отладчик и рекомпилятор Brainfuck на C#. Начинался как эксперимент с разными подходами к исполнению кода и со временем превратился в полноценный набор инструментов для работы с языком.",
    },
    links: [{ label: "source", url: "https://github.com/mxmgorin/csbf" }],
    tags: ["C#", "CLI"],
  },
  {
    name: "luar",
    desc: {
      en: "An ongoing attempt to build a Lua interpreter from scratch. The project serves as a hands-on exploration of language implementation, from lexing and parsing to runtime execution.",
      ru: "Попытка реализовать собственный интерпретатор Lua с нуля. Проект помогает мне изучать устройство языков программирования на практике: лексер, парсер, рантайм и всё, что находится между исходным кодом и его выполнением.",
    },
    links: [{ label: "source", url: "https://github.com/mxmgorin/luar" }],
    tags: ["Rust", "Lua", "CLI"],
  },
];
