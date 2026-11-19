// An entry without `url` renders as plain text, one line per item.
export const contactView = [
  {
    label: { en: "Interested in", ru: "Интересно" },
    text: {
      en: [
        "Rust & systems engineering",
        "browser engines: Servo, WebGL",
        "performance and low-level work",
        "open-source collaboration",
      ],
      ru: [
        "Rust и системная разработка",
        "браузерные движки: Servo, WebGL",
        "производительность и low-level",
        "совместный open source",
      ],
    },
  },
  {
    label: "Email",
    url: "mailto:hi@mxmgorin.dev",
    text: "hi@mxmgorin.dev",
  },
  {
    label: "GitHub",
    url: "https://github.com/mxmgorin",
    text: "github.com/mxmgorin",
  },
];
