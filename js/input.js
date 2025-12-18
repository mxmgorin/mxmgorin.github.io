import { moveUp, moveDown, select, state } from "./app.js";
import { render } from "./render.js";
import { isTermFocused, blurTerm, focusTerm } from "./term.js";

export function setupInput() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isTermFocused()) {
      e.preventDefault();
      blurTerm(true);
      return;
    }

    if ((e.key === "/" || e.key === ":") && !isTermFocused()) {
      e.preventDefault();
      focusTerm();
      return;
    }

    if (document.activeElement?.id === "command") {
      return;
    }

    const content = document.querySelector(".tui-content");
    switch (e.key) {
      case "ArrowUp":
        moveUp();
        break;
      case "ArrowDown":
        moveDown();
        break;
      case "Enter":
        select();
        break;
      case "PageUp":
        content.scrollBy({
          top: -content.clientHeight * 0.9,
          behavior: "instant",
        });
        e.preventDefault();
        break;
      case "PageDown":
        content.scrollBy({
          top: content.clientHeight * 0.9,
          behavior: "instant",
        });
        e.preventDefault();
        break;
      default:
        return;
    }

    e.preventDefault();
    render();
  });

  // Mouse navigation
  const menuRoot = document.querySelector(".tui-menu ul");

  menuRoot.addEventListener("click", (e) => {
    if (e.target.tagName !== "LI") return;

    const items = Array.from(menuRoot.children);
    const index = items.indexOf(e.target);

    if (index === -1) return;

    state.menuIndex = index;
    select();
  });
}
