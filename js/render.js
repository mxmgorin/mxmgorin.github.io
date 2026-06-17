import {
  state,
  Languages,
  setLang,
  DEFAULT_LANG,
  startGame,
  openPost,
  openBlogList,
  openView,
  filterProjects,
  filterBlog,
} from "./app.js";
import { menu, Views } from "./content/views.js";
import { projects, mainTags } from "./content/projects.js";
import { aboutView } from "./content/about.js";
import { contactView } from "./content/contact.js";
import { introView } from "./content/intro.js";
import { blogView } from "./content/blog.js";
import { renderMarkdown } from "./markdown.js";

const contentEl = document.getElementById("content");
const blockSeparator = " ".repeat(1);

export function render() {
  renderLangSelector();
  renderMenu();
  renderView();
}

function renderMenu() {
  const ul = document.querySelector(".tui-menu ul");
  ul.innerHTML = "";

  menu.forEach((item, i) => {
    const li = document.createElement("li");
    li.textContent = item;
    if (i === state.menuIndex) li.classList.add("active");
    ul.appendChild(li);
  });
}

function renderView() {
  contentEl.innerHTML = "";

  switch (state.view) {
    case Views.INTRO:
      contentEl.appendChild(newIntro());
      break;
    case Views.ABOUT:
      contentEl.appendChild(newAbout());
      break;
    case Views.BLOG:
      contentEl.appendChild(newBlog());
      break;
    case Views.PROJECTS:
      contentEl.appendChild(newProjects());
      break;
    case Views.CONTACT:
      contentEl.appendChild(newContact());
      break;

    default:
      renderElement("Under development");
  }
}

export function newGame(name, exitCallback) {
  const preEl = document.createElement("pre");
  const ok = startGame(preEl, name, () => {
    if (exitCallback) exitCallback();
    renderElement("\nGame exited.");
    contentEl.scrollTop = contentEl.scrollHeight;
  });

  if (!ok) {
    preEl.innerHTML = `Not found game '${name}'`;
  }

  return preEl;
}

export function newIntro() {
  return newText(introView);
}

export function newProjects() {
  const active = state.projectTag ?? null;
  const list = active
    ? projects.filter((p) => p.tags?.includes(active))
    : projects;

  const wrap = document.createElement("div");
  wrap.append(newTagFilterBar(mainTags, active, filterProjects));
  wrap.append(newBlocks(list));
  return wrap;
}

// Collect unique tags across items, preserving first-seen order.
function uniqueTags(items) {
  const all = [];
  items.forEach((it) =>
    it.tags?.forEach((t) => {
      if (!all.includes(t)) all.push(t);
    }),
  );
  return all;
}

// A clickable "filter: all · tag · tag" bar. onSelect(tag|null) is called on click.
function newTagFilterBar(allTags, active, onSelect) {
  const bar = document.createElement("div");
  bar.className = "tag-filter";
  bar.append(document.createTextNode("filter: "));
  bar.append(newTagFilter("all", active == null, () => onSelect(null)));
  allTags.forEach((t) => {
    bar.append(document.createTextNode(" · "));
    bar.append(newTagFilter(t, t === active, () => onSelect(t)));
  });
  return bar;
}

function newTagFilter(label, isActive, onClick) {
  const a = document.createElement("a");
  a.href = "#";
  a.textContent = label;
  a.className = "tag-filter-item" + (isActive ? " active" : "");
  a.onclick = (e) => {
    e.preventDefault();
    onClick();
  };
  return a;
}

export function newAbout() {
  return newText(aboutView);
}

export function newBlog() {
  return state.post ? newBlogPost(state.post) : newBlogList();
}

export function newBlogList() {
  const active = state.blogTag ?? null;
  const list = active
    ? blogView.filter((p) => p.tags?.includes(active))
    : blogView;

  const wrap = document.createElement("div");
  wrap.append(newTagFilterBar(uniqueTags(blogView), active, filterBlog));

  const pre = document.createElement("pre");
  list.forEach((post, i) => {
    const name = document.createElement("strong");
    const link = document.createElement("a");
    link.href = `/?v=blog&post=${encodeURIComponent(post.slug)}`;
    link.textContent = post.name;
    link.setAttribute("aria-label", `Read: ${post.name}`);
    link.onclick = (e) => {
      e.preventDefault();
      openPost(post.slug);
    };
    name.append(link);
    pre.append(name, document.createTextNode("\n"));

    const metaParts = [];
    if (post.date) metaParts.push(post.date);
    if (post.tags?.length) metaParts.push(post.tags.join(" | "));

    const meta = document.createElement("span");
    meta.className = "post-meta";
    meta.textContent = `  ${metaParts.join("  ·  ")}`;
    pre.append(meta, document.createTextNode("\n"));

    // reading time is computed from the post body, fetched lazily (and cached)
    fetchPost(post.slug, state.lang).then((md) => {
      if (md) meta.textContent += `  ·  ${readingTime(md)}`;
    });

    if (i < list.length - 1) {
      pre.append(document.createTextNode("\n"));
    }
  });

  wrap.append(pre);
  return wrap;
}

function newBlogPost(slug) {
  const container = document.createElement("div");
  container.className = "article";
  container.append(backLink());

  const post = blogView.find((p) => p.slug === slug);

  if (!post) {
    const err = document.createElement("p");
    err.textContent = `Post '${slug}' not found.`;
    container.append(err);
    return container;
  }

  const h1 = document.createElement("h1");
  h1.textContent = post.name;
  container.append(h1);

  const meta = document.createElement("p");
  meta.className = "article-meta";
  const bits = [];
  if (post.date) bits.push(post.date);
  if (post.tags?.length) bits.push(post.tags.join(" · "));
  meta.append(document.createTextNode(bits.join("  —  ")));
  const readingEl = document.createElement("span");
  meta.append(readingEl);
  container.append(meta);

  const body = document.createElement("div");
  body.className = "article-body";
  body.textContent = "Loading…";
  container.append(body);

  if (post.source) {
    const footer = document.createElement("p");
    footer.className = "article-source";
    const a = document.createElement("a");
    a.href = post.source;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "view the original";
    footer.append(document.createTextNode("Also published as a wiki page — "), a, document.createTextNode("."));
    container.append(footer);
  }

  container.append(backLink());

  loadPostBody(body, post, readingEl);

  return container;
}

function backLink() {
  const a = document.createElement("a");
  a.href = "/?v=blog";
  a.className = "back-link";
  a.textContent = "← back to blog";
  a.onclick = (e) => {
    e.preventDefault();
    openBlogList();
  };
  return a;
}

async function loadPostBody(body, post, readingEl) {
  const md = await fetchPost(post.slug, state.lang);

  if (md == null) {
    body.textContent = "Could not load this post.";
    return;
  }

  if (readingEl) readingEl.textContent = `  —  ${readingTime(md)}`;
  body.innerHTML = renderMarkdown(md, { resolveWiki });

  // intercept internal post links so navigation stays client-side
  body.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-post]");
    if (!link) return;
    e.preventDefault();
    openPost(link.getAttribute("data-post"));
  });
}

const postBodyCache = new Map();

async function fetchPost(slug, lang) {
  const key = `${slug}.${lang}`;
  if (postBodyCache.has(key)) return postBodyCache.get(key);

  const tries = lang === DEFAULT_LANG ? [lang] : [lang, DEFAULT_LANG];

  for (const l of tries) {
    try {
      const res = await fetch(`posts/${slug}.${l}.md`);
      if (res.ok) {
        const text = await res.text();
        postBodyCache.set(key, text);
        return text;
      }
    } catch (_) {
      // try the next language / give up
    }
  }

  postBodyCache.set(key, null);
  return null;
}

// Rough reading time at ~200 words per minute, counting word-like tokens only.
function readingTime(md) {
  const words = (md.match(/\S+/g) || []).filter((w) => /[A-Za-z0-9]/.test(w)).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

// Map wiki-link titles ([[...]]) to internal post slugs.
const wikiMap = new Map();
blogView.forEach((p) => {
  wikiMap.set(normalizeWiki(p.slug), p.slug);
  wikiMap.set(normalizeWiki(p.name), p.slug);
  (p.aliases ?? []).forEach((a) => wikiMap.set(normalizeWiki(a), p.slug));
});

function normalizeWiki(s) {
  return s
    .toLowerCase()
    .replace(/[‐-―]/g, "-") // unicode hyphens -> ascii
    .replace(/\s+/g, " ")
    .trim();
}

function resolveWiki(name) {
  return wikiMap.get(normalizeWiki(name)) ?? null;
}

export function newContact() {
  const pre = document.createElement("pre");

  contactView.forEach(({ label, url, text }) => {
    pre.append(document.createTextNode(`${label}:\n  `));

    const a = document.createElement("a");
    a.href = url;
    a.textContent = text;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    pre.append(a, document.createTextNode("\n\n"));
  });

  return pre;
}

function renderLangSelector() {
  const el = document.querySelector(".tui-header .lang");
  if (!el) return;

  el.innerHTML = "";

  Object.values(Languages).forEach((lang) => {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = lang.toUpperCase();

    if (state.lang === lang) {
      a.classList.add("active");
    }

    a.onclick = (e) => {
      e.preventDefault();
      setLang(lang);
      render();
    };

    el.append(a, document.createTextNode(" | "));
  });

  el.lastChild.remove(); // remove trailing separator
}

function newBlocks(items, title) {
  const pre = document.createElement("pre");

  const titleTr = getTranslated(title);
  if (titleTr) {
    const el = document.createElement("span");
    el.textContent = `${titleTr}\n\n`;
    el.classList.add("view-title");
    pre.append(el);
  }

  items.forEach((p, i) => {
    const name = document.createElement("strong");
    name.textContent = p.name;
    pre.append(name);

    const links = p.links ?? (p.url ? [{ label: "link", url: p.url }] : []);
    links.forEach((lnk) => {
      pre.append(document.createTextNode(" "));

      const link = document.createElement("a");
      link.textContent = `[${lnk.label}]`;
      link.setAttribute("aria-label", `${p.name} — ${lnk.label}`);

      if (lnk.view) {
        link.href = `/?v=${lnk.view}`;
        link.onclick = (e) => {
          e.preventDefault();
          openView(lnk.view, { tag: lnk.tag });
        };
      } else {
        link.href = lnk.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      pre.append(link);
    });

    const desc = getTranslated(p.desc);
    if (desc) {
      pre.append(
        document.createTextNode("\n"),
        document.createTextNode(`  ${desc}\n`),
      );
    }

    if (p.tags?.length) {
      const tags = document.createElement("span");
      tags.className = "tags";
      tags.textContent = `  [${p.tags.join(" | ")}]`;
      pre.append(tags, document.createTextNode("\n"));
    }

    if (i < items.length - 1) {
      pre.append(document.createTextNode(`${blockSeparator}\n`));
    }
  });

  return pre;
}

function newText(text) {
  const val = getTranslated(text);
  const pre = document.createElement("pre");
  pre.innerHTML = val;

  return pre;
}

function getTranslated(value) {
  return value?.[state.lang] ?? value?.[DEFAULT_LANG];
}

export function renderElement(element) {
  let node;

  if (element instanceof Node) {
    node = element;
  } else {
    const pre = document.createElement("pre");
    pre.textContent = Array.isArray(element) ? element.join("\n") : element;
    node = pre;
  }

  contentEl.appendChild(node);
  contentEl.scrollTop = contentEl.scrollHeight;
}

export function scroll(delta) {
  contentEl.scrollBy({
    top: contentEl.clientHeight * delta,
    behavior: "instant",
  });
}

export function clearContent() {
  contentEl.innerHTML = "";
}

function printLines(element, lines, delay = 200) {
  let index = 0;

  function step() {
    if (index >= lines.length) return;

    renderElement(lines[index]);
    index++;
    setTimeout(step, delay);
  }

  step();
}

function printWords(
  element,
  text,
  {
    delay = 60, // ms between words
    punctuationDelay = 250,
  } = {},
) {
  const tokens = text.split(/(\s+)/); // keeps spaces
  let i = 0;

  function step() {
    if (i >= tokens.length) return;

    element.textContent += tokens[i];

    const isPunctuation = /[.,!?]$/.test(tokens[i]);
    i++;

    setTimeout(step, isPunctuation ? punctuationDelay : delay);
  }

  step();
}

function printLetters(
  element,
  text,
  {
    delay = 10, // ms between characters
    newlineDelay = 100,
  } = {},
) {
  let i = 0;
  console.log("printLetters");

  function step() {
    if (i >= text.length) return;

    const isNewline = text[i] === "\n";

    if (isNewline) {
      element.innerHTML += "<br>";
    } else {
      element.innerHTML += text[i];
    }

    i++;

    setTimeout(step, isNewline ? newlineDelay : delay);
  }

  step();
}
