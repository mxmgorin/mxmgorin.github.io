// Open Graph card generator: builds a terminal-window SVG (1200×630) in the
// site's TUI palette. build-seo.mjs rasterizes the SVG to PNG with rsvg-convert
// so social unfurlers (which need a real raster image) show a branded preview.
//
// Pure string building, no dependencies. Text is laid out manually because SVG
// has no auto-wrap — but the card uses a monospace font, so character advance is
// predictable (~0.6em) and greedy word-wrap is exact.

const W = 1200;
const H = 630;

// Mirror of css/base.css :root palette.
const C = {
  bg: "#0b0f0c",
  panel: "#0f1612",
  border: "#1f2a23",
  fg: "#cfe8d8",
  muted: "#8fb3a0",
  accent: "#6fd19c",
};

// Monospace family present both locally and on the CI runner (fonts-dejavu-core).
const FONT = "DejaVu Sans Mono, monospace";
const CHAR_W = 0.6; // advance width per character, in em, for DejaVu Sans Mono

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Greedy word-wrap to a max character width, hard-breaking any word longer than
// the line. Returns an array of lines.
function wrap(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (word.length > maxChars) {
      if (line) {
        lines.push(line);
        line = "";
      }
      let w = word;
      while (w.length > maxChars) {
        lines.push(w.slice(0, maxChars));
        w = w.slice(maxChars);
      }
      line = w;
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Pick the largest title size whose wrapped form fits in `maxLines`.
function fitTitle(title, textWidth, sizes, maxLines) {
  for (const size of sizes) {
    const maxChars = Math.floor(textWidth / (CHAR_W * size));
    const lines = wrap(title, maxChars);
    if (lines.length <= maxLines) return { size, lines };
  }
  const size = sizes[sizes.length - 1];
  const maxChars = Math.floor(textWidth / (CHAR_W * size));
  const lines = wrap(title, maxChars).slice(0, maxLines);
  if (lines.length === maxLines) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1}$/, "…");
  }
  return { size, lines };
}

function frame(inner, cwd = "~/blog") {
  // Window geometry.
  const wx = 40,
    wy = 40,
    ww = W - 80,
    wh = H - 80;
  const dots = [
    { c: "#ff5f56", x: wx + 36 },
    { c: "#ffbd2e", x: wx + 64 },
    { c: "#27c93f", x: wx + 92 },
  ]
    .map((d) => `<circle cx="${d.x}" cy="${wy + 35}" r="9" fill="${d.c}"/>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="16" fill="${C.panel}" stroke="${C.border}" stroke-width="2"/>
  ${dots}
  <text x="${wx + 120}" y="${wy + 41}" font-family="${FONT}" font-size="22" fill="${C.muted}">guest@mxmgorin.dev: ${cwd}</text>
  <line x1="${wx}" y1="${wy + 70}" x2="${wx + ww}" y2="${wy + 70}" stroke="${C.border}" stroke-width="2"/>
  ${inner}
</svg>`;
}

// A blog post card: prompt line, big title, tags, footer.
export function postCardSvg({ title, tags = [], date = "", slug = "" }) {
  const padX = 88;
  const textWidth = W - 2 * padX;

  const { size, lines } = fitTitle(
    title,
    textWidth,
    [62, 54, 48, 42, 38],
    4,
  );
  const lineH = size * 1.18;

  // Vertically center the title block in the area between the prompt and tags.
  const top = 205;
  const bottom = 470;
  const blockH = lines.length * lineH;
  const startY = top + (bottom - top - blockH) / 2 + size;

  const titleTspans = lines
    .map(
      (ln, i) =>
        `<text x="${padX}" y="${startY + i * lineH}" font-family="${FONT}" font-size="${size}" font-weight="bold" fill="${C.accent}">${esc(ln)}</text>`,
    )
    .join("\n  ");

  const prompt = `<text x="${padX}" y="175" font-family="${FONT}" font-size="26" fill="${C.muted}"><tspan fill="${C.accent}">guest:~$</tspan> cat ${esc(slug)}.md</text>`;

  const tagLine = tags.length
    ? `<text x="${padX}" y="528" font-family="${FONT}" font-size="24" fill="${C.muted}">${esc(tags.join("  ·  "))}</text>`
    : "";

  const footer = `<text x="${padX}" y="572" font-family="${FONT}" font-size="22" fill="${C.muted}">${esc(date)}</text>
  <text x="${W - 88}" y="572" text-anchor="end" font-family="${FONT}" font-size="22" fill="${C.accent}">mxmgorin.dev</text>`;

  return frame(`${prompt}\n  ${titleTspans}\n  ${tagLine}\n  ${footer}`);
}

// The site landing card.
export function homeCardSvg({ title = "mxmgorin.dev", subtitle = "" }) {
  const padX = 88;
  const prompt = `<text x="${padX}" y="175" font-family="${FONT}" font-size="26" fill="${C.muted}"><tspan fill="${C.accent}">guest:~$</tspan> whoami</text>`;
  const big = `<text x="${padX}" y="330" font-family="${FONT}" font-size="72" font-weight="bold" fill="${C.accent}">${esc(title)}</text>`;
  const sub = wrap(subtitle, Math.floor((W - 2 * padX) / (CHAR_W * 28)))
    .slice(0, 3)
    .map(
      (ln, i) =>
        `<text x="${padX}" y="${400 + i * 38}" font-family="${FONT}" font-size="28" fill="${C.fg}">${esc(ln)}</text>`,
    )
    .join("\n  ");
  const footer = `<text x="${W - 88}" y="572" text-anchor="end" font-family="${FONT}" font-size="22" fill="${C.accent}">mxmgorin.dev</text>`;
  return frame(`${prompt}\n  ${big}\n  ${sub}\n  ${footer}`, "~");
}
