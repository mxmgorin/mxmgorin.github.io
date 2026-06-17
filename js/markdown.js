// Minimal, dependency-free Markdown -> HTML renderer.
//
// Supported: ATX headings (#..######), paragraphs, unordered/ordered lists
// (with nesting by indentation), fenced code blocks (```), inline code,
// bold (**), italic (*/_), links, images, blockquotes, horizontal rules,
// and wiki-style links ([[Page]]) resolved to internal posts.
//
// This is intentionally small. It targets the subset of Markdown used by the
// blog rather than the full CommonMark spec.

const LIST_RE = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;

export function renderMarkdown(src, opts = {}) {
  const resolveWiki = opts.resolveWiki ?? (() => null);
  const lines = String(src).replace(/\r\n?/g, "\n").split("\n");

  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // fenced code block
    if (/^\s*```/.test(line)) {
      const body = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      out.push(`<pre class="code"><code>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }

    // horizontal rule
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    // heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2].trim(), resolveWiki)}</h${level}>`);
      i++;
      continue;
    }

    // blockquote
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${inline(quote.join(" "), resolveWiki)}</blockquote>`);
      continue;
    }

    // list
    if (LIST_RE.test(line)) {
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_RE);
        if (m) {
          items.push({
            indent: m[1].length,
            type: /\d/.test(m[2]) ? "ol" : "ul",
            text: m[3],
          });
          i++;
          continue;
        }
        if (lines[i].trim() === "") {
          // a blank line stays inside the list only if a list item follows
          let k = i + 1;
          while (k < lines.length && lines[k].trim() === "") k++;
          if (k < lines.length && LIST_RE.test(lines[k])) {
            i++;
            continue;
          }
          break;
        }
        // non-blank, non-list line right after an item: treat as continuation
        if (items.length) {
          items[items.length - 1].text += " " + lines[i].trim();
          i++;
          continue;
        }
        break;
      }
      out.push(renderList(items, 0, items[0]?.indent ?? 0, resolveWiki).html);
      continue;
    }

    // paragraph
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !LIST_RE.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*```/.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) &&
      !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${inline(para.join(" "), resolveWiki)}</p>`);
  }

  return out.join("\n");
}

// Build nested list HTML from a flat array of {indent, type, text}.
function renderList(items, start, indent, resolveWiki) {
  const type = items[start]?.type ?? "ul";
  let html = `<${type}>`;
  let i = start;

  while (i < items.length && items[i].indent >= indent) {
    if (items[i].indent > indent) {
      const sub = renderList(items, i, items[i].indent, resolveWiki);
      // attach the sublist inside the previously opened <li>
      html = html.replace(/<\/li>$/, `${sub.html}</li>`);
      i = sub.next;
    } else {
      html += `<li>${inline(items[i].text, resolveWiki)}</li>`;
      i++;
    }
  }

  html += `</${type}>`;
  return { html, next: i };
}

// Inline formatting. Code spans, links and images are pulled out into tokens
// (sentinel \x00N\x00) so emphasis rules can't corrupt their contents; they
// are restored after escaping and emphasis have been applied.
function inline(text, resolveWiki) {
  const tokens = [];
  const hold = (html) => "\x00" + (tokens.push(html) - 1) + "\x00";

  let s = text;

  // inline code: `code`
  s = s.replace(/`([^`]+)`/g, (_, code) => hold(`<code>${escapeHtml(code)}</code>`));

  // images: ![alt](url)
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) =>
    hold(`<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" loading="lazy">`),
  );

  // wiki links: [[Page]] or [[Page|label]]
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, page, label) => {
    const linkText = escapeHtml((label ?? page).trim());
    const slug = resolveWiki(page.trim());
    if (slug) {
      return hold(
        `<a href="/?v=blog&post=${encodeURIComponent(slug)}" data-post="${escapeAttr(slug)}">${linkText}</a>`,
      );
    }
    return hold(linkText);
  });

  // links: [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const external = /^https?:\/\//.test(url);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return hold(`<a href="${escapeAttr(url)}"${attrs}>${escapeHtml(label)}</a>`);
  });

  // escape the remaining literal text
  s = escapeHtml(s);

  // emphasis: bold before italic
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^\w])_([^_]+)_/g, "$1<em>$2</em>");

  // restore protected tokens
  return s.replace(/\x00(\d+)\x00/g, (_, n) => tokens[Number(n)]);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}
