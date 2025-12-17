import { render } from "./render.js";
import { setupInput } from "./input.js";

function main() {
  setupInput(render);
  render();
}

main();
