// Each project can list multiple labeled links. A link with `view` navigates
// inside the site (e.g. to the blog); otherwise `url` opens in a new tab.

// Tags shown in the projects filter bar. Cards still display every tag; these
// are just the headline filters worth surfacing.
export const mainTags = ["Rust", "Go", "C#", "Lua"];

export const projects = [
  {
    name: "GMBoy",
    desc: {
      en: "My first emulator and the one I keep coming back to — a cross-platform Game Boy emulator chasing cycle-accuracy and performance. What started as \"how does this hardware actually work?\" became a long-term project.",
      ru: "Мой первый эмулятор — и тот, к которому я постоянно возвращаюсь. Кроссплатформенный эмулятор Game Boy с упором на точность и производительность. Начиналось с вопроса «как это железо вообще работает?», а выросло в долгосрочный проект.",
    },
    links: [{ label: "source", url: "https://github.com/mxmgorin/gmboy" }],
    tags: ["Rust", "Emulation", "SDL2", "OpenGL", "Android", "Desktop"],
  },
  {
    name: "retsurf",
    desc: {
      en: "Retro handhelds have Wi-Fi and a GPU but no usable web browser — so I built one. Servo renders the modern web; SDL2 and egui drive it from a gamepad, all in Rust.",
      ru: "У ретро-консолей есть Wi-Fi и GPU, но нет нормального браузера — поэтому я сделал свой. Servo рисует современный веб, а SDL2 и egui дают управление с геймпада, всё на Rust.",
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
      en: "A multi-frontend CHIP-8 / SCHIP / XO-CHIP emulator, built to get properly hands-on with Go — and to wrestle with the platform's many historical variants and quirks.",
      ru: "Мультифронтендный эмулятор CHIP-8 / SCHIP / XO-CHIP — сделал, чтобы как следует освоить Go и побороться с его многочисленными историческими вариантами и их особенностями (quirks).",
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
      en: "My open-source habit — porting games to ARM-based Linux handhelds as a PortMaster contributor.",
      ru: "Мое open-source хобби — портирую игры на портативные консоли на базе ARM-Linux как участник PortMaster.",
    },
    links: [
      { label: "profile", url: "https://portmaster.games/profile.html?porter=Troidem" },
    ],
    tags: ["Lua", "Bash", "GameDev"],
  },
  {
    name: "egui-sdl2",
    desc: {
      en: "A small library that grew out of my own projects: it wires egui to SDL2 — input handling and a few rendering backends — so you can drop an egui UI into an SDL2 app.",
      ru: "Небольшая библиотека, выросшая из моих собственных проектов: связывает egui с SDL2 — обработка ввода и несколько бэкендов рендеринга, — чтобы можно было встроить интерфейс на egui в SDL2-приложение.",
    },
    links: [{ label: "source", url: "https://github.com/mxmgorin/egui-sdl2" }],
    tags: ["Rust", "GUI", "SDL2", "OpenGL"],
  },
  {
    name: "csbf",
    desc: {
      en: "My take on Brainfuck: an interpreter, a debugger, and a recompiler, written in C# to play with different execution strategies.",
      ru: "Мой подход к Brainfuck: интерпретатор, отладчик и рекомпилятор на C# — написал, чтобы поэкспериментировать с разными стратегиями исполнения.",
    },
    links: [{ label: "source", url: "https://github.com/mxmgorin/csbf" }],
    tags: ["C#", "CLI"],
  },
  {
    name: "luar",
    desc: {
      en: "A Lua interpreter I wrote to learn how languages work from the inside — a custom lexer, parser, and runtime, built from scratch.",
      ru: "Интерпретатор Lua, который я написал, чтобы понять, как языки устроены изнутри — собственные лексер, парсер и рантайм, с нуля.",
    },
    links: [{ label: "source", url: "https://github.com/mxmgorin/luar" }],
    tags: ["Rust", "Lua", "CLI"],
  },
];
