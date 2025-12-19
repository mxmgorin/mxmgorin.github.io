export function createInvadersApp(screen, options = {}) {
  const history = options.history ?? "";
  const WIDTH = options.width ?? 40;
  const HEIGHT = options.height ?? 20;
  const TICK_MS = options.tickMs ?? 120;

  const EMPTY = " ";
  const WALL = "#";
  const PLAYER = "▲";
  const INVADER = "■";
  const BULLET = "|";

  let buffer = new Array(WIDTH * HEIGHT).fill(EMPTY);
  let timer = null;
  let alive = true;

  /* ------------------ helpers ------------------ */

  const idx = (x, y) => y * WIDTH + x;

  function clear() {
    buffer.fill(EMPTY);
  }

  function draw(x, y, ch) {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    buffer[idx(x, y)] = ch;
  }

  function flush() {
    let out = history + "\n";
    for (let y = 0; y < HEIGHT; y++) {
      const start = y * WIDTH;
      out += buffer.slice(start, start + WIDTH).join("") + "\n";
    }
    screen.textContent = out;
  }

  function drawBorders() {
    for (let x = 0; x < WIDTH; x++) {
      draw(x, 0, WALL);
      draw(x, HEIGHT - 1, WALL);
    }
    for (let y = 0; y < HEIGHT; y++) {
      draw(0, y, WALL);
      draw(WIDTH - 1, y, WALL);
    }
  }

  function drawTextCentered(text, y) {
    const x = Math.floor((WIDTH - text.length) / 2);
    for (let i = 0; i < text.length; i++) {
      draw(x + i, y, text[i]);
    }
  }

  /* ------------------ game state ------------------ */

  let player = {
    x: Math.floor(WIDTH / 2),
    y: HEIGHT - 2,
  };

  let bullets = [];
  let invaders = [];
  let invaderDir = 1;
  let invaderTick = 0;

  function spawnInvaders() {
    invaders = [];
    for (let y = 2; y < 6; y++) {
      for (let x = 4; x < WIDTH - 4; x += 2) {
        invaders.push({ x, y });
      }
    }
  }

  /* ------------------ logic ------------------ */

  function step() {
    if (!alive) return;

    // move bullets
    bullets = bullets
      .map((b) => ({ x: b.x, y: b.y - 1 }))
      .filter((b) => b.y > 0);

    // bullet vs invader
    bullets.forEach((b) => {
      invaders = invaders.filter((i) => !(i.x === b.x && i.y === b.y));
    });

    // invader movement
    invaderTick++;
    if (invaderTick % 6 === 0) {
      let hitWall = invaders.some(
        (i) => i.x + invaderDir <= 1 || i.x + invaderDir >= WIDTH - 2,
      );

      if (hitWall) {
        invaderDir *= -1;
        invaders.forEach((i) => i.y++);
      } else {
        invaders.forEach((i) => (i.x += invaderDir));
      }
    }

    // lose condition
    if (invaders.some((i) => i.y >= player.y)) {
      alive = false;
    }

    // win condition
    if (invaders.length === 0) {
      alive = false;
    }
  }

  /* ------------------ render ------------------ */

  function render() {
    clear();
    drawBorders();

    // player
    draw(player.x, player.y, PLAYER);

    // bullets
    bullets.forEach((b) => draw(b.x, b.y, BULLET));

    // invaders
    invaders.forEach((i) => draw(i.x, i.y, INVADER));

    if (!alive) {
      drawTextCentered("GAME OVER", Math.floor(HEIGHT / 2) - 1);
      drawTextCentered("Press Esc to exit", Math.floor(HEIGHT / 2) + 1);
    }

    flush();
  }

  function tick() {
    step();
    render();
    if (!alive) stop();
  }

  /* ------------------ input ------------------ */

  function handleKey(key) {
    if (!alive) {
      if (key === "Escape") exit();
      return true;
    }

    switch (key) {
      case "ArrowLeft":
      case "a":
        player.x = Math.max(1, player.x - 1);
        break;
      case "ArrowRight":
      case "d":
        player.x = Math.min(WIDTH - 2, player.x + 1);
        break;
      case " ":
        bullets.push({ x: player.x, y: player.y - 1 });
        break;
      case "Escape":
        exit();
        break;
      default:
        return false;
    }

    return true;
  }

  /* ------------------ lifecycle ------------------ */

  let onExit = null;

  function start(exitCallback) {
    onExit = exitCallback;
    alive = true;
    bullets = [];
    invaderDir = 1;
    spawnInvaders();
    timer = setInterval(tick, TICK_MS);
    render();
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
