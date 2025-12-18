export const projectsTitle = {
  en: "Things I build in my free time",
  ru: "Личные проекты вне основной работы",
};

export const projects = [
  {
    name: "GMBoy",
    desc: {
      en: "Cross-platform Game Boy emulator with a focus on accuracy, performance, and modern enhancements.",
      ru: "Кроссплатформенный эмулятор Game Boy, ориентированный на тактно-точную эмуляцию, высокую производительность и современные функциональность. Проект начинался как способ разобраться в работе аппаратуры и принципах эмуляции, но со временем перерос в более амбициозную и долгосрочную разработку.",
    },
    url: "https://github.com/mxmgorin/gmboy",
    tags: ["Rust", "Emulation", "SDL2", "OpenGL", "Android", "Desktop"],
  },
  {
    name: "ch8go",
    desc: {
      en: "Multi-frontend CHIP-8, SCHIP, and XO-CHIP VM (emulator) with broad compatibility across variants and quirks support.",
      ru: "Мультифронтендная виртуальная машина, реализующая CHIP-8, SCHIP и XO-CHIP, ориентированная на максимальную совместимость между различными историческими версиями платформы.",
    },
    url: "https://mxmgorin.github.io/ch8go/web/",
    tags: ["Go", "Emulation", "WASM", "CLI", "SDL2"],
  },
  {
    name: "Luar",
    desc: {
      en: "A Lua interpreter focused on understanding language internals through a custom lexer, parser, and runtime.",
      ru: "Интерпретатор для языка программирования Lua, созданный для изучения внутреннего устройства через реализацию лексера, парсера и рантайма.",
    },
    url: "https://github.com/mxmgorin/luar",
    tags: ["Rust", "Lua"],
  },
  {
    name: "Retsurf",
    desc: {
      en: "Lightweight web browser built using Servo engine and designed for retro and low-resource systems.",
      ru: "Эксперементальный веб-браузер на базе движка Servo, ориентированный на ретро- и малоресурсные системы.",
    },
    url: "https://github.com/mxmgorin/retsurf",
    tags: ["Rust", "Web"],
  },
  {
    name: "egui-sdl2",
    desc: {
      en: "Library that integrates egui with SDL2, providing input handling and rendering backends.",
      ru: "Библиотека для использования egui с SDL2, обеспечивающая обработку событий ввода полязователя и видео рендеринг с использованием мескольких бекендов.",
    },
    url: "https://github.com/mxmgorin/egui-sdl2",
    tags: ["Rust", "GUI", "SDL2", "OpenGL"],
  },
  {
    name: "PortMaster",
    desc: {
      en: "Contributor to PortMaster Games, porting several titles for ARM-based Linux handheld systems.",
      ru: "Участник проекта PortMaster Games, где я портировал несколько игр для портативных консолей на ARM-Linux системах.",
    },
    url: "https://portmaster.games/profile.html?porter=Troidem",
    tags: ["Lua", "Bash", "GameDev"],
  },
];
