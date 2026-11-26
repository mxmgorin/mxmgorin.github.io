import { render } from "./render.js";
import { setupInput } from "./input.js";
import { setupCli } from "./cli.js";
import { setupApp } from "./app.js";
import { setupPower } from "./power.js";

function main() {
  setupApp();
  setupInput();
  setupCli();
  setupPower();
  render();
}

main();
