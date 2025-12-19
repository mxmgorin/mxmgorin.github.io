export function createTetrisApp(screen, options = {}) {
  const history = options.history ?? "";
  const WIDTH = options.width ?? 22; // playfield + walls
  const HEIGHT = options.height ?? 22;
  const TICK_MS = options.tickMs ?? 500;

  const EMPTY = " ";
  const WALL = "#";
  const BLOCK = "■";

  let buffer = new Array(WIDTH * HEIGHT).fill(EMPTY);
  let timer = null;
  let alive = true;

  /* ------------------ grid ------------------ */

  // Playfield is inside walls
  const FIELD_W = WIDTH - 2;
  const FIELD_H = HEIGHT - 2;

  let field = Array.from({ length: FIELD_H }, () =>
    new Array(FIELD_W).fill(EMPTY),
  );

  /* ------------------ pieces ------------------ */

  const TETROMINOES = [
    [[1, 1, 1, 1]], // I
    [
      [1, 1],
      [1, 1],
    ], // O
    [
      [0, 1, 0],
      [1, 1, 1],
    ], // T
    [
      [1, 0, 0],
      [1, 1, 1],
    ], // J
    [
      [0, 0, 1],
      [1, 1, 1],
    ], // L
    [
      [1, 1, 0],
      [0, 1, 1],
    ], // S
    [
      [0, 1, 1],
      [1, 1, 0],
    ], // Z
  ];

  let piece = null;

  function spawnPiece() {
    const shape = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
    piece = {
      shape,
      x: Math.floor((FIELD_W - shape[0].length) / 2),
      y: 0,
    };

    if (collides(piece.x, piece.y, piece.shape)) {
      alive = false;
    }
  }

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

  /* ------------------ collision ------------------ */

  function collides(px, py, shape) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;

        const fx = px + x;
        const fy = py + y;

        if (
          fx < 0 ||
          fx >= FIELD_W ||
          fy >= FIELD_H ||
          field[fy]?.[fx] === BLOCK
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /* ------------------ game logic ------------------ */

  function lockPiece() {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          field[piece.y + y][piece.x + x] = BLOCK;
        }
      }
    }
    clearLines();
    spawnPiece();
  }

  function clearLines() {
    for (let y = FIELD_H - 1; y >= 0; y--) {
      if (field[y].every((c) => c === BLOCK)) {
        field.splice(y, 1);
        field.unshift(new Array(FIELD_W).fill(EMPTY));
        y++;
      }
    }
  }

  function rotate(shape) {
    return shape[0].map((_, i) => shape.map((row) => row[i]).reverse());
  }

  function step() {
    if (!alive) return;

    if (!collides(piece.x, piece.y + 1, piece.shape)) {
      piece.y++;
    } else {
      lockPiece();
    }
  }

  /* ------------------ render ------------------ */

  function render() {
    clear();
    drawBorders();

    // draw field
    for (let y = 0; y < FIELD_H; y++) {
      for (let x = 0; x < FIELD_W; x++) {
        if (field[y][x] === BLOCK) {
          draw(x + 1, y + 1, BLOCK);
        }
      }
    }

    // draw piece
    if (piece) {
      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x]) {
            draw(piece.x + x + 1, piece.y + y + 1, BLOCK);
          }
        }
      }
    }

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
    if (!piece || !alive) {
      if (key === "Escape") exit();
      return true;
    }

    switch (key) {
      case "ArrowLeft":
      case "a":
        if (!collides(piece.x - 1, piece.y, piece.shape)) piece.x--;
        break;
      case "ArrowRight":
      case "d":
        if (!collides(piece.x + 1, piece.y, piece.shape)) piece.x++;
        break;
      case "ArrowDown":
      case "s":
        step();
        break;
      case "ArrowUp":
      case "w": {
        const r = rotate(piece.shape);
        if (!collides(piece.x, piece.y, r)) piece.shape = r;
        break;
      }
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
    field = Array.from({ length: FIELD_H }, () =>
      new Array(FIELD_W).fill(EMPTY),
    );
    spawnPiece();
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
