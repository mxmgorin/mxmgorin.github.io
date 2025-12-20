export function createMatrixApp(screen, options = {}) {
  const history = options.history ?? "";
  const WIDTH = options.width ?? 60;
  const HEIGHT = options.height ?? 24;
  const TICK_MS = options.tickMs ?? 80;

  const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const FADE = " |*#█"; // low → high intensity
  const MAX = FADE.length - 1;

  let glyph = new Array(WIDTH * HEIGHT).fill(" ");
  let intensity = new Array(WIDTH * HEIGHT).fill(0);
  let timer = null;

  /* ------------------ helpers ------------------ */

  const idx = (x, y) => y * WIDTH + x;

  function draw(x, y, ch, level) {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    const i = idx(x, y);
    glyph[i] = ch;
    intensity[i] = Math.max(intensity[i], level);
  }

  function randChar() {
    return CHARS[Math.floor(Math.random() * CHARS.length)];
  }

  function flush() {
    let out = history + "\n";

    for (let y = 0; y < HEIGHT; y++) {
      let row = "";
      for (let x = 0; x < WIDTH; x++) {
        const i = idx(x, y);

        if (intensity[i] === 0) {
          row += " ";
        } else if (intensity[i] === MAX) {
          row += glyph[i]; // bright head
        } else {
          row += FADE[intensity[i]]; // fading trail
        }
      }
      out += row + "\n";
    }

    screen.textContent = out;
  }

  /* ------------------ matrix state ------------------ */

  const drops = new Array(WIDTH).fill(0);

  function resetDrop(x) {
    drops[x] = Math.floor(Math.random() * HEIGHT);
  }

  /* ------------------ logic ------------------ */

  function step() {
    // decay
    for (let i = 0; i < intensity.length; i++) {
      if (intensity[i] > 0) intensity[i]--;
    }

    // draw drops
    for (let x = 0; x < WIDTH; x++) {
      const y = drops[x];

      // head: real matrix character
      draw(x, y, randChar(), MAX);

      // trail
      if (Math.random() < 0.4 && y > 0) {
        draw(x, y - 1, glyph[idx(x, y)], MAX - 2);
      }

      drops[x]++;

      if (drops[x] >= HEIGHT + Math.random() * HEIGHT) {
        resetDrop(x);
      }
    }
  }

  function tick() {
    step();
    flush();
  }

  /* ------------------ input ------------------ */

  function handleKey(key) {
    exit();
    return true;
  }

  /* ------------------ lifecycle ------------------ */

  let onExit = null;

  function start(exitCallback) {
    onExit = exitCallback;
    intensity.fill(0);
    for (let x = 0; x < WIDTH; x++) resetDrop(x);
    timer = setInterval(tick, TICK_MS);
    flush();
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  function exit() {
    stop();
    if (onExit) onExit();
  }

  return {
    start,
    stop,
    handleKey,
  };
}
