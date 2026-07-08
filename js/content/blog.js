// Post index. Bodies live in /posts/<slug>.<lang>.md and are fetched on demand
// (ru falls back to en). `aliases` lists wiki-link titles that resolve to this
// post from inside Markdown ([[...]]). `source` is an optional external original.
export const blogView = [
  {
    slug: "csbf-toolchain",
    series: "csbf",
    name: {
      en: "Eight Instructions, a Whole Compiler: A Brainfuck Toolchain in C#",
      ru: "Восемь инструкций — целый компилятор: тулчейн Brainfuck на C#",
    },
    date: "2026-07-06",
    desc: {
      en: "Brainfuck has no syntax worth parsing, which makes it the perfect language to build a compiler for. csbf is a full C# toolchain: an optimizing IR, a reversible VM with time-travel debugging, a Go transpiler, an IL JIT, and a Blazor playground that runs most of it in the browser.",
      ru: "У Brainfuck нет синтаксиса, который стоит парсить, — и именно поэтому это идеальный язык, чтобы написать для него компилятор. csbf — полный тулчейн на C#: оптимизирующий IR, обратимая виртуальная машина с отладкой «назад во времени», транспайлер в Go, IL-JIT и плейграунд на Blazor, который запускает бо́льшую часть этого прямо в браузере.",
    },
    tags: ["C#", "Compilers", "Brainfuck", "WASM"],
  },
  {
    slug: "retsurf-performance",
    series: "retsurf",
    name: {
      en: "Every Megabyte Counts: A Browser on a 1 GB Handheld",
      ru: "Каждый мегабайт на счету: браузер для консолeй с 1 ГБ ОЗУ",
    },
    date: "2026-07-01",
    desc: {
      en: "A modern browser on a handheld with no dedicated VRAM and weak in-order cores. What actually moved the needle — deleting allocations, tuning Servo's prefs, and shipping three per-core binaries to dodge a SIGILL — and, just as important, what I chose not to do.",
      ru: "Современный браузер на консоли без выделенной VRAM и со слабыми in-order-ядрами. Что действительно дало результат — удаление аллокаций, тюнинг prefs у Servo, три бинарника под разные ядра ради обхода SIGILL — и, что не менее важно, чего я решил не делать.",
    },
    tags: ["Rust", "Performance", "Servo", "Memory"],
  },
  {
    slug: "retsurf-controls",
    series: "retsurf",
    name: {
      en: "A browser you drive with a gamepad",
      ru: "Браузер, которым управляешь с геймпада",
    },
    date: "2026-06-21",
    desc: {
      en: "A web browser assumes a mouse and a keyboard — a retro handheld has neither. How retsurf drives a full browser from a gamepad: intents not buttons, a virtual cursor, link hints with a gamepad alphabet, an on-screen keyboard, and in-app rebinding.",
      ru: "Веб-браузер рассчитан на мышь и клавиатуру — у ретро-консоли нет ни того, ни другого. Как retsurf управляет браузером с геймпада: намерения вместо кнопок, виртуальный курсор, подсказки-ссылки с геймпад-алфавитом, экранная клавиатура и перепривязка прямо в приложении.",
    },
    tags: ["Rust", "egui", "Gamepad", "UX"],
  },
  {
    slug: "retsurf-servo-sdl2",
    series: "retsurf",
    name: {
      en: "Embedding Servo in SDL2 — one GPU, too many bugs",
      ru: "Servo в SDL2 — один GPU и слишком много багов",
    },
    date: "2026-06-19",
    desc: {
      en: "Servo renders the web, SDL2 owns the window on bare hardware, egui draws the UI — and getting all three to share one GPU with no compositor and an old driver was a string of crashes. The unabridged tour, in the order they happened.",
      ru: "Servo рисует веб, SDL2 владеет окном на голом железе, egui — интерфейс. Заставить все три делить один GPU без композитора и со старым драйвером — это вереница крашей. Полный разбор, в том порядке, в котором они случались.",
    },
    tags: ["Rust", "Servo", "SDL2", "OpenGL"],
  },
  {
    slug: "retsurf-why",
    series: "retsurf",
    name: {
      en: "Building a Rust web browser for retro handhelds",
      ru: "Веб-браузер на Rust для ретро-консолей",
    },
    date: "2026-06-17",
    desc: {
      en: "Retro handhelds have Wi-Fi, a GPU, and a gigabyte of RAM — but no usable web browser. Why that gap exists, and how I'm closing it with retsurf, built on Servo, SDL2, and egui.",
      ru: "У ретро-консолей есть Wi-Fi, GPU и гигабайт памяти — но нет нормального браузера. Почему так вышло и как я закрываю этот пробел с помощью retsurf на базе Servo, SDL2 и egui.",
    },
    tags: ["Rust", "Web", "Servo"],
  },
  {
    slug: "chip8-testing",
    series: "ch8go",
    name: {
      en: "How I Test a CHIP-8 Emulator (When There's No \"Correct\")",
      ru: "Как я тестирую эмулятор CHIP-8 (когда нет «правильного»)",
    },
    date: "2026-01-14",
    desc: {
      en: "CHIP-8 has no single correct output, so here's how I test ch8go anyway — variant-aware ROM automation and byte-exact golden-file comparison.",
      ru: "Детерминированное тестирование виртуальной машины CHIP-8 с помощью ROM-файлов и сравнения вывода программы с эталонными результатами (golden-файлами) в виде PNG-изображений.",
    },
    tags: ["Go", "Emulation", "CHIP-8"],
    aliases: ["Testing"],
    source: "https://github.com/mxmgorin/ch8go/wiki/Testing",
  },
  {
    slug: "chip8-architecture",
    series: "ch8go",
    name: {
      en: "How I Structured My CHIP-8 Emulator (and Why)",
      ru: "Архитектура моего эмулятора CHIP-8 и почему именно так",
    },
    date: "2026-01-12",
    desc: {
      en: "After a Game Boy emulator taught me how platform code leaks into the core, I built ch8go around one rule: the core shouldn't know its frontend. A tour of its Guest / Host / App structure.",
      ru: "Разбор того, как устроена моя виртуальная машина CHIP-8: из каких компонентов она состоит, как выполняет инструкции, как организован код и почему я выбрал такую архитектуру.",
    },
    tags: ["Go", "Emulation", "CHIP-8"],
    aliases: ["Project Structure"],
    source: "https://github.com/mxmgorin/ch8go/wiki/Project-Structure",
  },
  {
    slug: "chip8-system",
    series: "ch8go",
    name: {
      en: "What CHIP-8 actually is (before you emulate it)",
      ru: "Что такое CHIP-8 на самом деле (прежде чем писать эмулятор)",
    },
    date: "2026-01-09",
    desc: {
      en: "The mental model I built before writing ch8go — what CHIP-8 really is, the variants that complicate it, and the quirks that bite every emulator author.",
      ru: "Обзор виртуальной машины CHIP-8, её исторических вариантов и основных компонентов: памяти, процессора, регистров, таймеров и дисплея.",
    },
    tags: ["CHIP-8", "docs"],
    aliases: ["CHIP-8 System", "CHIP‐8 System"],
    source: "https://github.com/mxmgorin/ch8go/wiki/CHIP%E2%80%908-System",
  },
];
