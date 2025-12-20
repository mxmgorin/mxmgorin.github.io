import { moveUp, moveDown, select, state, gameApp } from "./app.js";
import { render, scroll } from "./render.js";
import { blurCli, focusCli, isCliFocused } from "./cli.js";

export function setupInput() {
  document.addEventListener("keydown", (e) => {
    const handled = handleKey(e);

    if (handled) {
      return;
    }

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
        scroll(-0.9);
        e.preventDefault();
        break;
      case "PageDown":
        scroll(0.9);
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

// returns true when key event is consumed
function handleKey(e) {
  const cliFocused = isCliFocused();

  if ((e.key === "/" || e.key === ":") && !cliFocused) {
    e.preventDefault();
    focusCli();
    return true;
  }

  if (cliFocused) {
    if (e.key === "Escape") {
      e.preventDefault();
      blurCli(true);
    }

    // block navigation
    return true;
  }

  if (state.mode === "game" && gameApp) {
    return gameApp.handleKey(e.key);
  }

  return false;
}
