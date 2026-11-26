// Screen power: the monitor switch and the system shutdown/boot cycle.
// The switch blanks the screen and brings it back as it was. A shutdown also
// halts the system, so the next power-on runs the POST screen and boots into
// the home view. State is shown through classes on <html> (`powering-off`,
// `power-off`, `powering-on`) that css/power.css animates; the power-on of a
// page load is started before first paint by index.html and ended here.
// A page load that lands on the home view with CRT effects on boots too.

import { openHome, state } from "./app.js";
import { handhelds } from "./content/handhelds.js";
import { homeView } from "./content/views.js";
import { isCrtOn, screenAnimationsDone } from "./crt.js";
import { render } from "./render.js";
import { playSound } from "./sound.js";

const root = document.documentElement;

// Keeps a shutdown message readable before the screen goes dark.
const SHUTDOWN_DELAY_MS = 700;
const REBOOT_PAUSE_MS = 600;
const POST_LINE_MS = 150;
const POST_HOLD_MS = 400;
// Memory test: counts to MEMORY_KB in MEMORY_STEP_KB steps, MEMORY_TICK_MS apart.
const MEMORY_KB = 640;
const MEMORY_STEP_KB = 64;
const MEMORY_TICK_MS = 15;
const BIOS_SINCE = 2015;

let on = true;
let halted = false;
// Bumped by every power change so a stale animation ending is ignored.
let generation = 0;
let post = null;

export function setupPower() {
  // Capture phase: a waking click must not also follow a link or press a key.
  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest("[data-power-toggle]")) return;
      if (handlePowerInput()) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  if (root.classList.contains("powering-on")) {
    const current = generation;
    screenAnimationsDone().then(() => {
      if (current === generation) root.classList.remove("powering-on");
    });
    if (bootsOnLoad()) boot(render);
  }
}

// Checks whether the page load shows the boot screen; deep links and visitors
// who opted out of effects skip it.
function bootsOnLoad() {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return state.view === homeView && isCrtOn() && !reducedMotion;
}

// Wakes the screen or skips the boot screen; returns true if the input was spent on that.
export function handlePowerInput() {
  if (!on) {
    powerOn();
    return true;
  }

  if (post) {
    post.abort();
    return true;
  }

  return false;
}

export function togglePower() {
  if (on) {
    powerOff();
  } else {
    powerOn();
  }
}

// Halts the system after a short pause and switches the screen off.
export async function shutdownSystem() {
  await sleep(SHUTDOWN_DELAY_MS);
  await powerOff({ halt: true });
}

// Shuts down, then powers back on through the boot screen.
export async function rebootSystem() {
  await shutdownSystem();
  await sleep(REBOOT_PAUSE_MS);
  powerOn();
}

// Switches the screen off; `halt` also stops the system, so the next power-on boots.
async function powerOff({ halt = false } = {}) {
  halted ||= halt;
  if (!on) return;

  on = false;
  const current = ++generation;
  post?.abort();
  document.activeElement?.blur();
  syncPowerToggles();
  playSound("powerOff");
  root.classList.remove("powering-on");
  root.classList.add("powering-off");

  await screenAnimationsDone();
  if (current !== generation) return;
  root.classList.replace("powering-off", "power-off");
}

// Switches the screen on, booting first if the system was halted.
async function powerOn() {
  if (on) return;

  on = true;
  const current = ++generation;
  syncPowerToggles();
  playSound("powerOn");
  root.classList.remove("powering-off", "power-off");
  root.classList.add("powering-on");
  if (halted) {
    halted = false;
    boot(openHome);
  }

  await screenAnimationsDone();
  if (current !== generation) return;
  root.classList.remove("powering-on");
}

function syncPowerToggles() {
  document.querySelectorAll("[data-power-toggle]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(on));
  });
}

// Shows the POST screen over the TUI, then calls `onDone`.
async function boot(onDone) {
  const screen = document.createElement("pre");
  screen.className = "post-screen";
  document.querySelector(".tui").append(screen);

  const controller = new AbortController();
  post = controller;
  try {
    await runPost(screen, controller.signal);
  } catch (e) {
    if (e?.name !== "AbortError") throw e;
  } finally {
    if (post === controller) post = null;
    screen.remove();
    onDone();
  }
}

async function runPost(screen, signal) {
  const print = (line = "") => {
    screen.textContent += `${line}\n`;
  };
  const pause = () => sleep(POST_LINE_MS, signal);

  print(`mxmgorin BIOS v1.0  (C) ${BIOS_SINCE}-${new Date().getFullYear()} Maxim Gorin`);
  print();
  await pause();
  print(`CPU cores: ${navigator.hardwareConcurrency || 1}`);
  await pause();

  const before = screen.textContent;
  for (let kb = 0; kb < MEMORY_KB; kb += MEMORY_STEP_KB) {
    screen.textContent = `${before}Memory test: ${kb}K`;
    await sleep(MEMORY_TICK_MS, signal);
  }
  screen.textContent = before;
  print(`Memory test: ${MEMORY_KB}K OK`);
  await pause();

  print(`Display: ${isCrtOn() ? "CRT, green phosphor" : "flat panel"}`);
  await pause();
  print(`Detecting handhelds... ${handheldCount()} found`);
  await pause();
  print();
  print("Booting mxmgorin.dev...");
  await sleep(POST_HOLD_MS, signal);
}

function handheldCount() {
  return handhelds.reduce((n, maker) => n + maker.devices.length, 0);
}

// Resolves after `ms`; rejects with the abort reason if `signal` fires first.
function sleep(ms, signal) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
