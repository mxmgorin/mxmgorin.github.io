// Each project can list multiple labeled links. A link with `view` navigates
// inside the site (e.g. to the blog); otherwise `url` opens in a new tab.

// Tags shown in the projects filter bar. Cards still display every tag; these
// are just the headline filters worth surfacing.
export const mainTags = ["Rust", "Go", "C#", "Lua"];

export const projects = [
  {
    name: "GMBoy",
    desc: {
      en: "My first emulator, and still the one I put the most into — a cross-platform Game Boy emulator chasing cycle-accuracy and performance. It started as a way to understand how the hardware really works and grew into a long-term project.",
      ru: "Мой первый эмулятор — и тот, в который я вкладываю больше всего. Кроссплатформенный эмулятор Game Boy с упором на потактовую точность и производительность. Начинался как способ понять, как на самом деле работает железо, и вырос в долгосрочный проект.",
    },
    links: [{ label: "source", url: "https://github.com/mxmgorin/gmboy" }],
    tags: ["Rust", "Emulation", "SDL2", "OpenGL", "Android", "Desktop"],
  },
  {
    name: "retsurf",
    desc: {
      en: "An experiment in embedding the Servo engine: a lightweight web browser aimed at retro and low-resource handhelds.",
      ru: "Эксперимент со встраиванием движка Servo: лёгкий веб-браузер для ретро- и малоресурсных устройств.",
    },
    links: [{ label: "source", url: "https://github.com/mxmgorin/retsurf" }],
    tags: ["Rust", "Web"],
  },
  {
    name: "ch8go",
    desc: {
      en: "A multi-frontend CHIP-8 / SCHIP / XO-CHIP emulator I built to get properly hands-on with Go, aiming for broad compatibility across the platform's many historical variants and quirks.",
      ru: "Мультифронтендный эмулятор CHIP-8 / SCHIP / XO-CHIP, который я сделал, чтобы как следует освоить Go. Цель — широкая совместимость с историческими вариантами платформы и их особенностями (quirks).",
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
      ru: "Моя open-source привычка — портирую игры на портативные консоли на базе ARM-Linux как участник PortMaster.",
    },
    links: [
      { label: "profile", url: "https://portmaster.games/profile.html?porter=Troidem" },
    ],
    tags: ["Lua", "Bash", "GameDev"],
  },
  {
    name: "egui-sdl2",
    desc: {
      en: "A small library that grew out of my own needs — it wires egui up to SDL2 with input handling and a few rendering backends.",
      ru: "Небольшая библиотека, выросшая из моих собственных задач: связывает egui с SDL2 — обработка ввода и несколько бэкендов рендеринга.",
    },
    links: [{ label: "source", url: "https://github.com/mxmgorin/egui-sdl2" }],
    tags: ["Rust", "GUI", "SDL2", "OpenGL"],
  },
  {
    name: "csbf",
    desc: {
      en: "My take on Brainfuck — an interpreter, debugger, and recompiler for the language, written in C# to experiment with different execution strategies.",
      ru: "Мой подход к Brainfuck — интерпретатор, отладчик и рекомпилятор языка на C#, написанные чтобы поэкспериментировать со способами исполнения.",
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
