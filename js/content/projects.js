// Each project can list multiple labeled links. A link with `view` navigates
// inside the site (e.g. to the blog); otherwise `url` opens in a new tab.

export const githubUser = "mxmgorin";

// Tags shown in the projects filter bar. Cards still display every tag; these
// are just the headline filters worth surfacing.
export const mainTags = ["Rust", "Go", "C#", "Lua"];

// `tagline`: one-line summary; `desc`: the longer story.
// A GitHub `source` link enables a live star count.
export const projects = [
  {
    name: "retsurf",
    tagline: {
      en: "web browser for retro handhelds, driven by a gamepad",
      ru: "веб-браузер для ретро-консолей с управлением с геймпада",
    },
    desc: {
      en: "It felt odd that modern retro handhelds come with Wi-Fi and capable graphics hardware, yet still lack a decent web browser. So I built one. The browser uses Servo for rendering modern websites, SDL2 and egui for a gamepad-friendly user interface, and is written entirely in Rust.",
      ru: "У современных ретро-консолей есть Wi-Fi, GPU и вполне приличное железо, но нормального браузера для них практически нет. Этот проект — попытка исправить ситуацию. За отображение страниц отвечает Servo, а SDL2 и egui обеспечивают интерфейс и управление с геймпада.",
    },
    links: [
      { label: "site", url: "https://retsurf.app" },
      { label: "download", url: "https://github.com/mxmgorin/retsurf/releases/latest" },
      { label: "source", url: "https://github.com/mxmgorin/retsurf" },
      { label: "posts", view: "blog", tag: "Servo" },
    ],
    tags: ["Rust", "Servo", "SDL2", "egui", "Android"],
  },
  {
    name: "retsend",
    tagline: {
      en: "LocalSend client: Wi-Fi file transfer for handhelds",
      ru: "клиент LocalSend: передача файлов по Wi-Fi для консолей",
    },
    desc: {
      en: "Getting files onto a handheld usually means a cable, SSH or pulling the SD card. retsend sends and receives files over Wi-Fi with your phone or PC, works with the official LocalSend apps, and runs on retro handhelds, the PS Vita, Android and Linux — all driven by a gamepad.",
      ru: "Закинуть файлы на консоль обычно значит возиться с кабелем, SSH или вынимать SD-карту. retsend отправляет и принимает файлы по Wi-Fi с телефона или ПК, совместим с официальными приложениями LocalSend и работает на ретро-консолях, PS Vita, Android и Linux — с управлением с геймпада.",
    },
    links: [
      { label: "download", url: "https://github.com/mxmgorin/retsend/releases/latest" },
      { label: "source", url: "https://github.com/mxmgorin/retsend" },
    ],
    tags: ["Rust", "SDL2", "egui", "Networking", "PS Vita", "Android"],
  },
  {
    name: "oxGBC",
    tagline: {
      en: "Game Boy / Game Boy Color emulator",
      ru: "эмулятор Game Boy и Game Boy Color",
    },
    desc: {
      en: "My first emulator and one of my longest-running projects. It started as an attempt to understand how the Game Boy works under the hood and grew into a full Game Boy / Game Boy Color emulator in Rust: cycle-accurate emulation, a GUI with save states, rewind and shaders, and up to 10× speed on weak ARM hardware.",
      ru: "Мой первый эмулятор и проект, к которому я постоянно возвращаюсь. Начинался как попытка разобраться в устройстве Game Boy, а вырос в полноценный эмулятор Game Boy и Game Boy Color на Rust: потактовая точность, GUI с сейв-стейтами, перемоткой и шейдерами — и до 10× скорости на слабом ARM-железе.",
    },
    links: [
      { label: "demo", url: "https://oxgbc.mxmgorin.dev/" },
      { label: "download", url: "https://github.com/mxmgorin/oxgbc/releases/latest" },
      { label: "source", url: "https://github.com/mxmgorin/oxgbc" },
    ],
    tags: ["Rust", "Emulation", "SDL2", "OpenGL", "Android", "Desktop", "WASM"],
  },
  {
    name: "ch8go",
    tagline: {
      en: "CHIP-8, SUPER-CHIP and XO-CHIP emulator",
      ru: "эмулятор CHIP-8, SUPER-CHIP и XO-CHIP",
    },
    desc: {
      en: "I started this project to get hands-on experience with Go. It eventually grew into a multi-frontend CHIP-8, SCHIP, and XO-CHIP emulator, while teaching me just how many incompatible variations and quirks have accumulated throughout the platform's history.",
      ru: "Начинал этот проект, чтобы как следует освоить Go. В итоге получил мультифронтендный эмулятор CHIP-8, SCHIP и XO-CHIP и гораздо лучшее понимание того, насколько запутанной может быть история платформы с десятками несовместимых вариаций.",
    },
    links: [
      { label: "demo", url: "https://ch8go.mxmgorin.dev/" },
      { label: "source", url: "https://github.com/mxmgorin/ch8go" },
      { label: "posts", view: "blog", tag: "CHIP-8" },
    ],
    tags: ["Go", "Emulation", "WASM", "CLI", "SDL2"],
  },
  {
    name: "csbf",
    tagline: {
      en: "Brainfuck compiler toolchain: optimizing IR, VM, JIT",
      ru: "компилятор Brainfuck: оптимизирующий IR, VM, JIT",
    },
    desc: {
      en: "After building emulators that run someone else's bytecode, I wanted to write a compiler that produces it instead — in the simplest language I could find. Brainfuck has almost no syntax, so the compiler itself gets all the attention: an optimizing IR and a handful of backends on top of it — from an interpreter with reversible debugging to a native IL JIT. And it's a great way to actually see how a compiler works on the inside.",
      ru: "После эмуляторов, исполняющих чужой байткод, захотелось написать компилятор, который его создаёт, — и на максимально простом языке. У Brainfuck почти нет синтаксиса, поэтому всё внимание достаётся самому компилятору: оптимизирующему IR и нескольким бэкендам поверх него — от интерпретатора с обратимой отладкой до нативного IL-JIT. Заодно отличный способ увидеть, как компилятор устроен изнутри.",
    },
    links: [
      { label: "demo", url: "https://mxmgorin.github.io/csbf/" },
      { label: "source", url: "https://github.com/mxmgorin/csbf" },
      { label: "posts", view: "blog", tag: "Brainfuck" },
    ],
    tags: ["C#", "Compilers", "Brainfuck", "WASM", "CLI"],
  },
  {
    name: "ftlhelm",
    tagline: {
      en: "gamepad and touchscreen support for FTL on Linux",
      ru: "геймпад и тачскрин для FTL на Linux",
    },
    desc: {
      en: "FTL: Faster Than Light is built around a mouse, which a handheld doesn't have. ftlhelm loads alongside the game and maps gamepad and touch input onto its own controls — rooms, weapons, crew and doors get direct buttons and radial wheels — without touching the game files. Runs on Linux, the Steam Deck and retro handhelds via PortMaster.",
      ru: "FTL: Faster Than Light целиком построена вокруг мыши, а у портативной консоли мыши нет. ftlhelm загружается вместе с игрой и переводит геймпад и тачскрин в её родное управление: комнаты, оружие, экипаж и двери получают свои кнопки и радиальные меню, а файлы игры остаются нетронутыми. Работает на Linux, Steam Deck и ретро-консолях через PortMaster.",
    },
    links: [
      { label: "download", url: "https://github.com/mxmgorin/ftlhelm/releases/latest" },
      { label: "source", url: "https://github.com/mxmgorin/ftlhelm" },
    ],
    tags: ["Rust", "LD_PRELOAD", "Gamepad", "Steam Deck", "GameDev"],
  },
  {
    name: "egui-sdl2",
    tagline: {
      en: "egui integration for SDL2",
      ru: "интеграция egui с SDL2",
    },
    desc: {
      en: "A small library that grew out of my own projects. It bridges egui and SDL2, providing input handling and multiple rendering backends to make embedding egui interfaces into SDL2 applications straightforward.",
      ru: "Небольшая библиотека, выросшая из моих собственных проектов. Она связывает egui и SDL2, предоставляя обработку ввода и несколько бэкендов рендеринга, чтобы интерфейсы на egui можно было легко встраивать в SDL2-приложения.",
    },
    links: [
      { label: "crate", url: "https://crates.io/crates/egui-sdl2" },
      { label: "source", url: "https://github.com/mxmgorin/egui-sdl2" },
    ],
    tags: ["Rust", "GUI", "SDL2", "OpenGL"],
  },
  {
    name: "luar",
    tagline: {
      en: "Lua interpreter from scratch",
      ru: "интерпретатор Lua с нуля",
    },
    desc: {
      en: "An ongoing attempt to build a Lua interpreter from scratch. The project serves as a hands-on exploration of language implementation, from lexing and parsing to runtime execution.",
      ru: "Попытка реализовать собственный интерпретатор Lua с нуля. Проект помогает мне изучать устройство языков программирования на практике: лексер, парсер, рантайм и всё, что находится между исходным кодом и его выполнением.",
    },
    links: [{ label: "source", url: "https://github.com/mxmgorin/luar" }],
    tags: ["Rust", "Lua", "CLI"],
  },
];

// Upstream projects I contribute to. A link with `prs` (an owner/repo) points at
// my merged pull requests there and shows their live count.
export const contributions = [
  {
    name: "Servo",
    tagline: {
      en: "web engine written in Rust",
      ru: "веб-движок на Rust",
    },
    desc: {
      en: "retsurf is built on Servo, so I ended up fixing things upstream. Most of my patches are WebGL and WebGL 2 conformance fixes; others touch layout, painting and memory reporting, plus EGL fixes in surfman, Servo's GL context library.",
      ru: "retsurf построен на Servo, так что со временем я начал исправлять его сам. Большая часть патчей — исправления соответствия спецификациям WebGL и WebGL 2; остальные касаются раскладки, отрисовки и учёта памяти, плюс исправления EGL в surfman — библиотеке GL-контекстов Servo.",
    },
    links: [
      { label: "site", url: "https://servo.org" },
      { label: "prs", prs: "servo/servo" },
    ],
    tags: ["Rust", "WebGL", "OpenGL", "Layout"],
  },
  {
    name: "PortMaster",
    tagline: {
      en: "crew member, porting games to ARM Linux handhelds",
      ru: "участник команды, порты игр на портативные ARM Linux-консоли",
    },
    desc: {
      en: "One of my favorite open-source activities is porting games to ARM Linux handhelds as a member of the PortMaster crew, helping bring games to devices they were never originally designed for. Since 2024 I've brought over thirty games to these devices — among them BLUE REVOLVER, SNKRX, BYTEPATH, Max Downforce, Mines of Moria and Slipstream — plus my own retsend.",
      ru: "Одно из моих любимых open-source занятий — портировать игры на портативные ARM Linux-консоли в составе команды PortMaster и делать их доступными на устройствах, для которых они изначально не предназначались. С 2024 года перенёс на эти устройства больше тридцати игр — среди них BLUE REVOLVER, SNKRX, BYTEPATH, Max Downforce, Mines of Moria и Slipstream — и мой собственный retsend.",
    },
    links: [
      { label: "profile", url: "https://portmaster.games/profile.html?porter=Troidem" },
      { label: "prs", prs: "PortsMaster/PortMaster-New" },
    ],
    tags: ["Lua", "Bash", "GameDev"],
  },
  {
    name: "spruceOS",
    tagline: {
      en: "custom firmware for Miyoo, TrimUI and Anbernic handhelds",
      ru: "кастомная прошивка для консолей Miyoo, TrimUI и Anbernic",
    },
    desc: {
      en: "A faster boot to the menu, BaseOS support and boot and shutdown fixes for the Miyoo Flip, and power, fan and backlight tweaks for the TrimUI Smart Pro S.",
      ru: "Ускорил загрузку до меню, добавил поддержку BaseOS и исправил загрузку и выключение на Miyoo Flip, а также доработал питание, вентилятор и подсветку на TrimUI Smart Pro S.",
    },
    links: [
      { label: "repo", url: "https://github.com/spruceUI/spruceOS" },
      { label: "prs", prs: "spruceUI/spruceOS" },
    ],
    tags: ["Bash", "Python", "Firmware"],
  },
  {
    name: "Allium",
    tagline: {
      en: "custom launcher for the Miyoo Mini",
      ru: "кастомный лаунчер для Miyoo Mini",
    },
    desc: {
      en: "Mostly performance work: memory-mapped fonts, row-wise framebuffer access, a cached wallpaper and faster startup hotkeys — plus volume and brightness indicators and a startup volume setting.",
      ru: "В основном производительность: шрифты через mmap, построчный доступ к фреймбуферу, кэш обоев и быстрое чтение горячих клавиш при старте — плюс индикаторы громкости и яркости и настройка громкости при запуске.",
    },
    links: [
      { label: "repo", url: "https://github.com/goweiwen/Allium" },
      { label: "prs", prs: "goweiwen/Allium" },
    ],
    tags: ["Rust", "Performance"],
  },
];
