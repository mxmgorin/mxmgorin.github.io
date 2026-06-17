// Post index. Bodies live in /posts/<slug>.<lang>.md and are fetched on demand
// (ru falls back to en). `aliases` lists wiki-link titles that resolve to this
// post from inside Markdown ([[...]]). `source` is an optional external original.
export const blogView = [
  {
    slug: "retsurf-why",
    name: "Why I built a web browser for a retro handheld",
    date: "2026-06-17",
    desc: {
      en: "Retro handhelds have Wi-Fi, a GPU, and a gigabyte of RAM — but no usable web browser. Why that gap exists, and how I'm closing it with retsurf, built on Servo, SDL2, and egui.",
      ru: "У ретро-консолей есть Wi-Fi, GPU и гигабайт памяти — но нет нормального браузера. Почему так вышло и как я закрываю этот пробел с помощью retsurf на базе Servo, SDL2 и egui.",
    },
    tags: ["Rust", "Web", "Servo"],
  },
  {
    slug: "chip8-testing",
    name: "How I Test a CHIP-8 Emulator (When There's No \"Correct\")",
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
    name: "How I Structured My CHIP-8 Emulator (and Why)",
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
    name: "Getting to Know CHIP-8 Before Emulating It",
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
