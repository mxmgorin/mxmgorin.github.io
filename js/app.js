import { menu, Views } from "./content/views.js";

export const state = {
  menuIndex: 0,
  view: Views.ABOUT,
};

export function moveUp() {
  state.menuIndex = Math.max(0, state.menuIndex - 1);
}

export function moveDown() {
  state.menuIndex = Math.min(menu.length - 1, state.menuIndex + 1);
}

export function select() {
  state.view = menu[state.menuIndex];
}
