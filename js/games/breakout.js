export function createBreakoutApp(screen, options = {}) {
  const history = options.history ?? "";
  const WIDTH = options.width ?? 40;
  const HEIGHT = options.height ?? 20;
  const TICK_MS = options.tickMs ?? 80;

  const EMPTY = " ";
  const WALL = "#";
  const PADDLE = "=";
  const BALL = "●";
  const BRICK = "■";

  let buffer = new Array(WIDTH * HEIGHT).fill(EMPTY);
  let timer = null;
  let alive = true;
  let win = false;
  let ballTick = 0;
  const BALL_SPEED = 2; // higher = slower

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
      out += buffer.slice(y * WIDTH, y * WIDTH + WIDTH).join("") + "\n";
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

  const paddle = {
    w: 7,
    x: Math.floor(WIDTH / 2) - 3,
    y: HEIGHT - 2,
  };

  let ball;
  let bricks = [];

  function spawnBricks() {
    bricks = [];
    for (let y = 2; y < 6; y++) {
      for (let x = 2; x < WIDTH - 2; x += 3) {
        bricks.push({ x, y, w: 2 });
      }
    }
  }

  function resetBall() {
    ball = {
      x: paddle.x + Math.floor(paddle.w / 2),
      y: paddle.y - 1,
      dx: 1,
      dy: -1,
    };
  }

  /* ------------------ logic ------------------ */

  function step() {
    if (!alive) return;

    ballTick++;
    if (ballTick % BALL_SPEED !== 0) return;

    let nx = ball.x + ball.dx;
    let ny = ball.y + ball.dy;

    // wall collision
    if (nx <= 1 || nx >= WIDTH - 2) ball.dx *= -1;
    if (ny <= 1) ball.dy *= -1;

    // paddle collision
    if (
      ny === paddle.y - 1 &&
      nx >= paddle.x &&
      nx < paddle.x + paddle.w
    ) {
      ball.dy = -1;
      const hit = nx - paddle.x;
      ball.dx = hit < paddle.w / 2 ? -1 : 1;
    }

    // brick collision
    bricks = bricks.filter(b => {
      const hit = ny === b.y && nx >= b.x && nx < b.x + b.w;
      if (hit) {
        ball.dy *= -1;
        return false;
      }
      return true;
    });

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.y >= HEIGHT - 1) {
      alive = false;
      win = false;
    }

    if (bricks.length === 0) {
      alive = false;
      win = true;
    }
  }


  /* ------------------ render ------------------ */

  function render() {
    clear();
    drawBorders();

    // paddle
    for (let i = 0; i < paddle.w; i++) {
      draw(paddle.x + i, paddle.y, PADDLE);
    }

    // ball
    draw(ball.x, ball.y, BALL);

    // bricks
    bricks.forEach((b) => {
      for (let i = 0; i < b.w; i++) {
        draw(b.x + i, b.y, BRICK);
      }
    });

    if (!alive) {
      drawTextCentered(win ? "YOU WIN" : "GAME OVER", HEIGHT / 2 - 1);
      drawTextCentered("Press Esc to exit", HEIGHT / 2 + 1);
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
        paddle.x = Math.max(1, paddle.x - 1);
        break;
      case "ArrowRight":
      case "d":
        paddle.x = Math.min(WIDTH - 1 - paddle.w, paddle.x + 1);
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
    win = false;
    spawnBricks();
    resetBall();
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
