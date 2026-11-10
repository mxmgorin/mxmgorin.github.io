// What I'm focused on at the moment (a "now page", see nownownow.com).
// The first section is the headline: its item names also appear on the home card.
export const nowView = {
  updated: "2026-11-10",
  sections: [
    {
      title: { en: "Building", ru: "Делаю" },
      items: [
        {
          name: "retsurf",
          url: "https://retsurf.app",
          text: {
            en: "Interface themes, a new UI font and Android text input fixes, plus a landing page at retsurf.app.",
            ru: "Темы интерфейса, новый шрифт, исправления ввода текста на Android и лендинг на retsurf.app.",
          },
        },
        {
          name: "ftlhelm",
          url: "https://github.com/mxmgorin/ftlhelm",
          text: {
            en: "Just shipped 1.0: FTL: Faster Than Light with a gamepad or touchscreen on Linux handhelds and the Steam Deck. Polishing input mapping across devices.",
            ru: "Только что вышла 1.0: FTL: Faster Than Light с геймпадом и тачскрином на Linux-консолях и Steam Deck. Довожу раскладку ввода на разных устройствах.",
          },
        },
      ],
    },
    {
      title: { en: "Porting", ru: "Портирую" },
      items: [
        {
          name: "Slipstream",
          url: "https://github.com/mxmgorin/slipstream-handheld",
          text: {
            en: "Full-screen races on 4:3 and 1:1 handheld screens for its PortMaster port.",
            ru: "Полноэкранные гонки на экранах 4:3 и 1:1 для порта в PortMaster.",
          },
        },
      ],
    },
    {
      title: { en: "Recently shipped", ru: "Недавно вышло" },
      items: [
        {
          name: "retsend 1.0",
          url: "https://github.com/mxmgorin/retsend",
          text: {
            en: "A LocalSend client: Wi-Fi file transfer for retro handhelds, PS Vita, Android and Linux.",
            ru: "Клиент LocalSend: передача файлов по Wi-Fi для ретро-консолей, PS Vita, Android и Linux.",
          },
        },
        {
          name: "egui-sdl2 0.12",
          url: "https://crates.io/crates/egui-sdl2",
          text: {
            en: "egui integration for SDL2 with software, OpenGL and wgpu backends.",
            ru: "Интеграция egui с SDL2: программный, OpenGL и wgpu-бэкенды.",
          },
        },
      ],
    },
  ],
};
