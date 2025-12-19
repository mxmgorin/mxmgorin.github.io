export function createSnakeApp(screen, options = {}) {
  const history = options.history;
  const WIDTH = options.width ?? 40;
  const HEIGHT = options.height ?? 20;
  const TICK_MS = options.tickMs ?? 120;

  const EMPTY = " ";
  const WALL = "#";
  const BODY = "■"; //"█";
  const HEAD = "■";
  const FOOD = "●";

  let buffer = new Array(WIDTH * HEIGHT).fill(EMPTY);
  let timer = null;
  let alive = true;

  let dir = "right";
  let nextDir = "right";

  let snake = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
  ];

  let food = spawnFood();

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

  function spawnFood() {
    while (true) {
      const x = 1 + Math.floor(Math.random() * (WIDTH - 2));
      const y = 1 + Math.floor(Math.random() * (HEIGHT - 2));
      if (!snake.some((s) => s.x === x && s.y === y)) {
        return { x, y };
      }
    }
  }

  function opposite(a, b) {
    return (
      (a === "up" && b === "down") ||
      (a === "down" && b === "up") ||
      (a === "left" && b === "right") ||
      (a === "right" && b === "left")
    );
  }

  /* ------------------ game logic ------------------ */

  function step() {
    if (!alive) return;

    if (!opposite(dir, nextDir)) {
      dir = nextDir;
    }

    const head = { ...snake[0] };

    switch (dir) {
      case "up":
        head.y--;
        break;
      case "down":
        head.y++;
        break;
      case "left":
        head.x--;
        break;
      case "right":
        head.x++;
        break;
    }

    // wall collision
    if (
      head.x <= 0 ||
      head.y <= 0 ||
      head.x >= WIDTH - 1 ||
      head.y >= HEIGHT - 1
    ) {
      alive = false;
      return;
    }

    // self collision
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      alive = false;
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      food = spawnFood();
    } else {
      snake.pop();
    }
  }

  function render() {
    clear();
    drawBorders();

    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      draw(s.x, s.y, i === 0 ? HEAD : BODY);
    }

    draw(food.x, food.y, FOOD);

    if (!alive) {
      drawTextCentered("GAME OVER", Math.floor(HEIGHT / 2) - 1);
      drawTextCentered("Press Esc to exit", Math.floor(HEIGHT / 2) + 1);
    }

    flush();
  }

  function tick() {
    step();
    render();

    if (!alive) {
      stop();
    }
  }

  /* ------------------ input ------------------ */

  function handleKey(key) {
    switch (key) {
      case "ArrowUp":
      case "w":
        nextDir = "up";
        break;
      case "ArrowDown":
      case "s":
        nextDir = "down";
        break;
      case "ArrowLeft":
      case "a":
        nextDir = "left";
        break;
      case "ArrowRight":
      case "d":
        nextDir = "right";
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

  function drawTextCentered(text, y) {
    const x = Math.floor((WIDTH - text.length) / 2);
    for (let i = 0; i < text.length; i++) {
      draw(x + i, y, text[i]);
    }
  }

  return {
    start,
    stop,
    handleKey,
  };
}
