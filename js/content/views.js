export const Views = {
  HOME: "home",
  INTRO: "intro",
  ABOUT: "about",
  NOW: "now",
  PROJECTS: "projects",
  BLOG: "blog",
  CONTACT: "contact",
};

export const menu = [
  // Views.INTRO,
  Views.ABOUT,
  Views.NOW,
  Views.PROJECTS,
  Views.BLOG,
  Views.CONTACT,
];

// The landing state when no page is selected (no ?v= param): a clean console
// that auto-prints the neofetch card and a row of suggestions.
export const homeView = Views.HOME;
