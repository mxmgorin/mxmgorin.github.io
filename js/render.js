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
import { projects, contributions, mainTags, githubUser } from "./content/projects.js";
import { aboutView } from "./content/about.js";
import { contactView } from "./content/contact.js";
import { introView } from "./content/intro.js";
import { blogView } from "./content/blog.js";
import { nowView } from "./content/now.js";
import { portrait } from "./content/portrait.js";
import { renderMarkdown } from "./markdown.js";
import { isCrtOn, toggleCrt } from "./crt.js";
import { t } from "./i18n.js";

const contentEl = document.getElementById("content");
const blockSeparator = " ".repeat(1);

export function render() {
  applyChrome();
  renderLangSelector();
  renderCrtToggle();
  renderMenu();
  renderView();
}

// Update the static, non-view chrome that lives in index.html so it reflects
// the active language (the document language, header hints, input placeholder).
function applyChrome() {
  document.documentElement.lang = state.lang;

  const hints = document.querySelector(".kbd-hints");
  if (hints) hints.textContent = t("kbdHints");

  const command = document.getElementById("command");
  if (command) command.placeholder = t("placeholder");
}

function renderMenu() {
  const ul = document.querySelector(".tui-menu ul");
  ul.innerHTML = "";

  menu.forEach((item, i) => {
    const li = document.createElement("li");
    li.textContent = t(`menu.${item}`);
    if (i === state.menuIndex) li.classList.add("active");
    ul.appendChild(li);
  });
}

function renderView() {
  contentEl.innerHTML = "";

  switch (state.view) {
    case Views.HOME: {
      const card = newNeofetchCard();
      contentEl.appendChild(card.el);
      typeColumns(card.columns, {
        onDone: () => {
          // No auto-scroll: keeps the card's top in view on short screens.
          contentEl.appendChild(
            newCommandSuggestions(`\n${t("welcomeTry")}`, [
              "about",
              "now",
              "projects",
              "blog",
              "contact",
              "snake",
            ]),
          );
        },
      });
      break;
    }
    case Views.INTRO:
      contentEl.appendChild(newIntro());
      break;
    case Views.ABOUT:
      contentEl.appendChild(newAbout());
      break;
    case Views.NOW:
      contentEl.appendChild(newNow());
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
      renderElement(t("underDevelopment"));
  }
}

export function newGame(name, exitCallback) {
  const preEl = document.createElement("pre");
  const ok = startGame(preEl, name, () => {
    if (exitCallback) exitCallback();
    renderElement(t("gameExited"));
    contentEl.scrollTop = contentEl.scrollHeight;
  });

  if (!ok) {
    preEl.innerHTML = t("gameNotFound", name);
  }

  return preEl;
}

export function newIntro() {
  return newText(introView);
}

export function newProjects() {
  const active = state.projectTag ?? null;
  const byTag = (items) => (active ? items.filter((p) => p.tags?.includes(active)) : items);

  const wrap = document.createElement("div");
  wrap.append(newTagFilterBar(mainTags, active, filterProjects));
  wrap.append(newBlocks(byTag(projects)));

  const upstream = byTag(contributions);
  if (upstream.length) {
    const block = newBlocks(upstream, t("contributionsTitle"));
    block.classList.add("contributions");
    wrap.append(block);
  }
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

// A collapsible "filter ▸ <active>" spoiler. Collapsed by default to stay
// compact; expands to an "all · tag · tag" row. onSelect(tag|null) fires on
// click, which re-renders — so the spoiler snaps shut showing the new choice.
function newTagFilterBar(allTags, active, onSelect) {
  const details = document.createElement("details");
  details.className = "tag-filter";

  const summary = document.createElement("summary");
  summary.className = "tag-filter-summary";

  const label = document.createElement("span");
  label.className = "tag-filter-label";
  label.textContent = t("filterLabel");

  const caret = document.createElement("span");
  caret.className = "tag-filter-caret";
  caret.setAttribute("aria-hidden", "true");

  const activeLabel = document.createElement("span");
  activeLabel.className = "tag-filter-active";
  activeLabel.textContent = active == null ? t("filterAll") : active;

  summary.append(
    label,
    document.createTextNode(" "),
    caret,
    document.createTextNode(" "),
    activeLabel,
  );
  details.append(summary);

  const list = document.createElement("div");
  list.className = "tag-filter-list";
  list.append(newTagFilter(t("filterAll"), active == null, () => onSelect(null)));
  allTags.forEach((tag) => {
    list.append(document.createTextNode(" · "));
    list.append(newTagFilter(tag, tag === active, () => onSelect(tag)));
  });
  details.append(list);

  return details;
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

export function newNow() {
  const pre = document.createElement("pre");

  const intro = document.createElement("span");
  intro.className = "post-meta";
  intro.textContent = t("nowIntro", nowView.updated);
  pre.append(intro, "\n");

  nowView.sections.forEach((section) => {
    const title = document.createElement("span");
    title.className = "view-title";
    title.textContent = getTranslated(section.title);
    pre.append("\n", title, "\n");

    section.items.forEach((item) => {
      const name = document.createElement("strong");
      name.append(item.url ? newExternalLink(item.url, item.name) : item.name);
      pre.append("  ", name, ` — ${getTranslated(item.text)}\n`);
    });
  });

  return pre;
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

  // Tag filter and the html/rss links share one row so they cost no extra
  // vertical space.
  const top = document.createElement("div");
  top.className = "blog-top";
  top.append(newTagFilterBar(uniqueTags(blogView), active, filterBlog));

  const links = document.createElement("span");
  links.className = "blog-links";

  // The static (crawlable, no-JS) mirror of this list, generated under /blog/.
  const staticLink = document.createElement("a");
  staticLink.href = state.lang === Languages.RU ? "/blog/ru/" : "/blog/";
  staticLink.textContent = t("blogStatic");
  staticLink.target = "_blank";
  staticLink.rel = "noopener noreferrer";

  const rss = document.createElement("a");
  rss.href = "/feed.xml";
  rss.textContent = t("blogRss");
  rss.target = "_blank";
  rss.rel = "noopener noreferrer";

  links.append(staticLink, rss);
  top.append(links);

  wrap.append(top);

  const pre = document.createElement("pre");
  list.forEach((post, i) => {
    const name = document.createElement("strong");
    const link = document.createElement("a");
    link.href = `/?v=blog&post=${encodeURIComponent(post.slug)}`;
    const title = getTranslated(post.name);
    link.textContent = title;
    link.setAttribute("aria-label", t("readAria", title));
    link.onclick = (e) => {
      e.preventDefault();
      openPost(post.slug);
    };
    if (post.series) {
      const badge = document.createElement("span");
      badge.className = "post-series";
      badge.textContent = `[${post.series}] `;
      pre.append(badge);
    }
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
    err.textContent = t("postNotFound", slug);
    container.append(err);
    return container;
  }

  const h1 = document.createElement("h1");
  h1.textContent = getTranslated(post.name);
  container.append(h1);

  const meta = document.createElement("p");
  meta.className = "article-meta";
  const bits = [];
  if (post.date) bits.push(post.date);
  if (post.tags?.length) bits.push(post.tags.join(" · "));
  meta.append(document.createTextNode(bits.join("  —  ")));
  const readingEl = document.createElement("span");
  meta.append(readingEl);
  meta.append(document.createTextNode("   "), readerLink(post));
  container.append(meta);

  const body = document.createElement("div");
  body.className = "article-body";
  body.textContent = t("loading");
  container.append(body);

  if (post.source) {
    const footer = document.createElement("p");
    footer.className = "article-source";
    const a = document.createElement("a");
    a.href = post.source;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = t("viewOriginal");
    footer.append(document.createTextNode(t("alsoPublishedPrefix")), a, document.createTextNode("."));
    container.append(footer);
  }

  const series = newSeriesBlock(post);
  if (series) container.append(series);

  container.append(backLink());

  loadPostBody(body, post, readingEl);

  return container;
}

// Posts in the same series, in reading (chronological) order.
function seriesPosts(series) {
  return blogView
    .filter((p) => p.series === series)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// A "part of the <series> series" nav listing every post in the series, in
// order, with the current one marked. Returns null when the post has no series
// or is the only one in it.
function newSeriesBlock(post) {
  if (!post.series) return null;
  const siblings = seriesPosts(post.series);
  if (siblings.length < 2) return null;

  const nav = document.createElement("nav");
  nav.className = "article-series";
  nav.setAttribute("aria-label", t("seriesLabel", post.series));

  const title = document.createElement("p");
  title.className = "article-series-title";
  title.textContent = t("seriesLabel", post.series);
  nav.append(title);

  const ol = document.createElement("ol");
  siblings.forEach((p) => {
    const li = document.createElement("li");
    const label = getTranslated(p.name);
    if (p.slug === post.slug) {
      li.setAttribute("aria-current", "true");
      const strong = document.createElement("strong");
      strong.textContent = label;
      const here = document.createElement("span");
      here.className = "series-here";
      here.textContent = ` — ${t("seriesCurrent")}`;
      li.append(strong, here);
    } else {
      const a = document.createElement("a");
      a.href = `/?v=blog&post=${encodeURIComponent(p.slug)}`;
      a.textContent = label;
      a.onclick = (e) => {
        e.preventDefault();
        openPost(p.slug);
      };
      li.append(a);
    }
    ol.append(li);
  });
  nav.append(ol);
  return nav;
}

// The shareable, crawlable URL for a post: the static page generated under
// /blog/<slug>/ (and /ru/ when a Russian version exists). location.origin keeps
// it correct in dev and prod, and through any future custom domain. A Russian
// page exists exactly for posts whose name is translated (object with `ru`),
// which mirrors the presence of a <slug>.ru.md body the generator builds from.
function postShareUrl(post) {
  const hasRu = typeof post.name === "object" && post.name.ru;
  const langSeg = state.lang === Languages.RU && hasRu ? "ru/" : "";
  return `${location.origin}/blog/${post.slug}/${langSeg}`;
}

// Opens the static (crawlable, no-JS) page for this post — same URL the copy
// button copies, but as a plain navigable link.
function readerLink(post) {
  const a = document.createElement("a");
  a.href = postShareUrl(post);
  a.className = "back-link";
  a.textContent = t("blogStatic");
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

function backLink() {
  const a = document.createElement("a");
  a.href = "/?v=blog";
  a.className = "back-link";
  a.textContent = t("backToBlog");
  a.onclick = (e) => {
    e.preventDefault();
    openBlogList();
  };
  return a;
}

async function loadPostBody(body, post, readingEl) {
  const md = await fetchPost(post.slug, state.lang);

  if (md == null) {
    body.textContent = t("couldNotLoadPost");
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
  const words = (md.match(/\S+/g) || []).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return t("minRead", minutes);
}

// Map wiki-link titles ([[...]]) to internal post slugs.
const wikiMap = new Map();
blogView.forEach((p) => {
  wikiMap.set(normalizeWiki(p.slug), p.slug);
  // name may be a plain string or a { lang: title } map — register every title
  const titles = typeof p.name === "string" ? [p.name] : Object.values(p.name);
  titles.forEach((t) => wikiMap.set(normalizeWiki(t), p.slug));
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

// The feed subscribe panel: RSS + JSON Feed URLs as external links. Backs the
// `rss` CLI command and mirrors newContact's link style. URLs are built from the
// live origin so they're correct on whatever host the page is served from.
export function newFeed() {
  const pre = document.createElement("pre");
  pre.append(document.createTextNode(`${t("feedTitle")}\n\n`));

  const addRow = (label, path) => {
    pre.append(document.createTextNode(`  ${label.padEnd(6)}`));
    const a = document.createElement("a");
    a.href = path;
    a.textContent = location.origin + path;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    pre.append(a, document.createTextNode("\n"));
  };

  addRow(t("feedRss"), "/feed.xml");
  addRow(t("feedJson"), "/feed.json");
  pre.append(document.createTextNode(`\n${t("feedHint")}`));
  return pre;
}

// The header CRT toggle mirrors the `crt` CLI command: dim/un-pressed when off,
// accent-lit/pressed when on. State + persistence live in crt.js.
function renderCrtToggle() {
  const btn = document.querySelector(".tui-header .crt-toggle");
  if (!btn) return;

  const sync = () => {
    btn.setAttribute("aria-pressed", String(isCrtOn()));
    btn.title = t("crtToggleTitle");
  };

  sync();
  btn.onclick = () => {
    toggleCrt();
    sync();
  };
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

    el.append(a); // segments are divided by CSS borders, not text separators
  });
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

    const tagline = getTranslated(p.tagline);
    if (tagline) pre.append(` — ${tagline}`);
    pre.append("\n ");

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
        link.href = lnk.prs ? mergedPrsUrl(lnk.prs) : lnk.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      pre.append(link);
    });
    pre.append(newStars(p), newMergedPrs(p));

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

const GITHUB_REPO_URL = /^https:\/\/github\.com\/([^/]+)\/([^/?#]+)/;
// The GitHub API's largest page size.
const GITHUB_MAX_PER_PAGE = 100;
const starsByOwner = new Map();

// Star counts of a GitHub user's repos, keyed by lowercase repo name, fetched
// once per page load; resolves to an empty map when the API is unavailable.
function fetchStars(owner) {
  if (!starsByOwner.has(owner)) {
    const url = `https://api.github.com/users/${owner}/repos?per_page=${GITHUB_MAX_PER_PAGE}`;
    starsByOwner.set(
      owner,
      fetch(url)
        .then((res) => (res.ok ? res.json() : []))
        .then((repos) => new Map(repos.map((r) => [r.name.toLowerCase(), r.stargazers_count])))
        .catch(() => new Map()),
    );
  }
  return starsByOwner.get(owner);
}

// A span that fills in with the star count of the project's GitHub source repo;
// stays empty for non-GitHub sources and unstarred repos.
function newStars(project) {
  const span = document.createElement("span");
  span.className = "stars";

  const source = project.links?.find((l) => l.label === "source")?.url;
  const match = source?.match(GITHUB_REPO_URL);
  if (!match) return span;

  const [, owner, repo] = match;
  fetchStars(owner).then((stars) => {
    const count = stars.get(repo.toLowerCase());
    if (!count) return;
    span.textContent = `  ★ ${count}`;
    span.title = t("starsTitle", count);
  });
  return span;
}

const MERGED_PRS_QUERY = `is:pr is:merged author:${githubUser}`;
const mergedPrsByRepo = new Map();

function mergedPrsUrl(repo) {
  return `https://github.com/${repo}/pulls?q=${encodeURIComponent(MERGED_PRS_QUERY)}`;
}

// Number of my merged pull requests in an owner/repo, fetched once per page load;
// resolves to null when the API is unavailable.
function fetchMergedPrs(repo) {
  if (!mergedPrsByRepo.has(repo)) {
    const q = encodeURIComponent(`repo:${repo} ${MERGED_PRS_QUERY}`);
    mergedPrsByRepo.set(
      repo,
      fetch(`https://api.github.com/search/issues?q=${q}&per_page=1`)
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => body?.total_count ?? null)
        .catch(() => null),
    );
  }
  return mergedPrsByRepo.get(repo);
}

// A span that fills in with the merged PR count behind the item's `prs` link;
// stays empty without one or when the count is unknown.
function newMergedPrs(item) {
  const span = document.createElement("span");
  span.className = "stars";

  const repo = item.links?.find((l) => l.prs)?.prs;
  if (!repo) return span;

  fetchMergedPrs(repo).then((count) => {
    if (count) span.textContent = `  · ${t("mergedPrs", count)}`;
  });
  return span;
}

function newText(text) {
  const val = getTranslated(text);
  const pre = document.createElement("pre");
  pre.innerHTML = val;

  return pre;
}

function getTranslated(value) {
  if (typeof value === "string") return value; // plain (unlocalized) strings pass through
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
    onDone,
  } = {},
) {
  const tokens = text.split(/(\s+)/); // keeps spaces
  let i = 0;

  function step() {
    if (i >= tokens.length) {
      if (onDone) onDone();
      return;
    }

    element.textContent += tokens[i];

    const isPunctuation = /[.,!?]$/.test(tokens[i]);
    i++;

    setTimeout(step, isPunctuation ? punctuationDelay : delay);
  }

  step();
}

// Build a single <pre> from mixed parts: plain strings become text (newlines
// included), and { cmd, label? } objects become clickable command links.
// Clicks are handled by a delegated listener in cli.js via the data-cmd attr.
export function newCliBlock(parts) {
  const pre = document.createElement("pre");
  appendParts(pre, parts);
  return pre;
}

// Appends newCliBlock-style parts; { url, label } parts become external links.
function appendParts(el, parts) {
  for (const part of parts) {
    if (typeof part === "string") {
      el.append(document.createTextNode(part));
    } else if (part.url) {
      el.append(newExternalLink(part.url, part.label));
    } else {
      const a = document.createElement("a");
      a.href = "#";
      a.className = "cmd-link";
      a.dataset.cmd = part.cmd;
      a.textContent = part.label ?? part.cmd;
      el.append(a);
    }
  }
}

function newExternalLink(url, text) {
  const a = document.createElement("a");
  a.href = url;
  a.textContent = text;
  if (!url.startsWith("mailto:")) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  return a;
}

// A line of clickable command tokens with an optional leading label.
export function newCommandSuggestions(labelText, cmds) {
  const parts = labelText ? [labelText] : [];
  cmds.forEach((cmd, i) => {
    if (i) parts.push("  ");
    parts.push({ cmd });
  });
  return newCliBlock(parts);
}

const HOST = "mxmgorin.dev";

// The neofetch card: portrait and info as two <pre> columns, each paired with the
// lines it should hold. The columns start empty.
function newNeofetchCard(user = "guest") {
  const el = document.createElement("div");
  el.className = "neofetch";

  const art = document.createElement("pre");
  art.className = "neofetch-art";
  art.setAttribute("aria-hidden", "true");

  const { lines, hang } = neofetchInfo(user);
  const info = document.createElement("pre");
  info.className = "neofetch-info";
  info.style.setProperty("--hang", `${hang}ch`);

  el.append(art, info);
  return {
    el,
    columns: [
      { pre: art, lines: portrait },
      { pre: info, lines },
    ],
  };
}

// The info column: a user@host header, then aligned "Key: value" rows. Returns
// the lines (each a list of newCliBlock-style parts) and the value column's offset.
function neofetchInfo(user) {
  const header = `${user}@${HOST}`;
  const email = contactView.find((c) => c.url.startsWith("mailto:"));
  const rows = t("neofetchRows", {
    now: { cmd: "now", label: nowView.sections[0].items.map((i) => i.name).join(" · ") },
    oss: { cmd: "projects", label: contributions.map((c) => c.name).join(" · ") },
    contact: email ? { url: email.url, label: email.text } : "",
  });

  const keys = rows.map(([key]) => `${key}: `);
  const hang = Math.max(...keys.map((k) => k.length));

  const lines = [
    [header],
    ["─".repeat(header.length)],
    ...rows.map(([, value], i) => [keys[i].padEnd(hang), value]),
  ];
  return { lines, hang };
}

// The finished neofetch card (used by the `neofetch` command, printed at once).
export function newNeofetch(user = "guest") {
  const card = newNeofetchCard(user);
  fillColumns(card.columns);
  return card.el;
}

// One block per line, so a wrapped line can be indented as a unit.
function appendLine(pre, line) {
  const el = document.createElement("span");
  el.className = "neofetch-line";
  appendParts(el, typeof line === "string" ? [line] : line);
  pre.append(el);
}

function fillColumns(columns) {
  columns.forEach(({ pre, lines }) => lines.forEach((line) => appendLine(pre, line)));
}

// Reveal columns a slice per tick — a terminal-style "boot" print. Every column
// finishes on the same tick. Bails if the card is detached mid-animation.
function typeColumns(columns, { delay = 80, onDone } = {}) {
  const ticks = Math.min(...columns.map((c) => c.lines.length));
  const shown = columns.map(() => 0);
  let tick = 0;

  function step() {
    if (columns[0].pre.isConnected === false) return;
    if (tick >= ticks) {
      if (onDone) onDone();
      return;
    }
    tick += 1;
    columns.forEach(({ pre, lines }, c) => {
      const target = Math.ceil((tick * lines.length) / ticks);
      for (; shown[c] < target; shown[c] += 1) {
        appendLine(pre, lines[shown[c]]);
      }
    });
    setTimeout(step, delay);
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
