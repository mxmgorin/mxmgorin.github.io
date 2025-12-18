import { moveUp, moveDown, select, state } from "./app.js";
import { render } from "./render.js";

export function setupInput() {
  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
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
    render()
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
