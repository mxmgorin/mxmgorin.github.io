// SEO / discoverability generator.
//
// The site is a client-rendered "Web TUI": post bodies are fetched and rendered
// in the browser, so crawlers and social-media unfurlers see only an empty
// shell. This script closes that gap WITHOUT changing the TUI. For every post it
// emits a standalone, crawlable page under /blog/<slug>/ that contains the real
// article HTML plus full meta tags (canonical, Open Graph, Twitter, JSON-LD,
// hreflang). It also writes sitemap.xml, robots.txt and an RSS feed, and refreshes
// the <noscript> fallback in index.html.
//
// The article HTML is produced by the SAME renderer the browser uses
// (js/markdown.js), so static and client output stay in sync. Per-post Open
// Graph cards are SVGs (tools/og-card.mjs) rasterized to PNG via rsvg-convert.
// Run via `make seo` / `npm run seo`; CI re-runs it on every push
// (.github/workflows/seo.yml).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { blogView } from "../js/content/blog.js";
import { renderMarkdown } from "../js/markdown.js";
import { postCardSvg, homeCardSvg } from "./og-card.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://mxmgorin.dev";
const SITE_NAME = "mxmgorin.dev";
const DEFAULT_LANG = "en";
const AUTHOR = "Maxim Gorin";
const AUTHOR_URL = "https://github.com/mxmgorin";
const RIGHTS = { en: "All rights reserved.", ru: "Все права защищены." };

const LOCALES = { en: "en_US", ru: "ru_RU" };
const MIN_READ = {
  en: (m) => `${m} min read`,
  ru: (m) => `${m} мин чтения`,
};
const BACK_TO_BLOG = { en: "← back to blog", ru: "← назад к блогу" };
const OPEN_TUI = {
  en: "▶ open in the terminal UI",
  ru: "▶ открыть в терминале",
};
const ALSO_PUBLISHED = {
  en: ["Also published as a wiki page — ", "view the original"],
  ru: ["Также опубликовано как вики-страница — ", "открыть оригинал"],
};
const SERIES_LABEL = {
  en: (s) => `${s} series`,
  ru: (s) => `Серия ${s}`,
};
const SERIES_CURRENT = { en: "you are here", ru: "вы здесь" };
const BLOG_INDEX = {
  en: {
    title: "Blog",
    desc: "Posts on emulators, virtual machines, browsers, compilers and low-level systems — in Rust, Go and C# — by Maxim Gorin.",
    intro: "Posts on emulators, virtual machines, browsers and low-level systems — in Rust, Go and C#.",
  },
  ru: {
    title: "Блог",
    desc: "Статьи об эмуляторах, виртуальных машинах, браузерах, компиляторах и низкоуровневых системах — на Rust, Go и C# — Максим Горин.",
    intro: "Статьи об эмуляторах, виртуальных машинах, браузерах и низкоуровневых системах — на Rust, Go и C#.",
  },
};

const OG_W = 1200;
const OG_H = 630;
const SITE_TAGLINE = "Systems programming, mostly out of curiosity — and for fun.";
const FEED_DESC = "Projects and notes on emulation, compilers, and low-level systems.";

/* ----------------------------------------------------------------- helpers */

// Rasterize an SVG string to a PNG file via rsvg-convert (librsvg). Returns true
// on success; false (with a warning) if the tool is missing or fails, so the
// build still produces pages — just without freshly rendered cards.
let rasterizerWarned = false;
function rasterize(svg, outPath) {
  const res = spawnSync(
    "rsvg-convert",
    ["-w", String(OG_W), "-h", String(OG_H), "-o", outPath],
    { input: svg },
  );
  if (res.error || res.status !== 0) {
    if (!rasterizerWarned) {
      rasterizerWarned = true;
      const why = res.error ? res.error.message : `exit ${res.status}`;
      console.warn(
        `! rsvg-convert unavailable (${why}); skipping OG image generation.\n` +
          `  Install librsvg (Arch: pacman -S librsvg, Debian/CI: librsvg2-bin).`,
      );
    }
    return false;
  }
  return true;
}

function getTranslated(field, lang) {
  if (field == null) return "";
  if (typeof field === "string") return field;
  return field[lang] ?? field[DEFAULT_LANG] ?? "";
}

function escAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Copyright notice. `year` is included per-post (its publication year); omit it
// for site-wide surfaces (hub, feed) where a single year would be arbitrary.
function copyrightLine(lang, year) {
  const r = RIGHTS[lang] ?? RIGHTS[DEFAULT_LANG];
  return year ? `© ${year} ${AUTHOR} · ${r}` : `© ${AUTHOR} · ${r}`;
}

// Mirror of render.js: word-like tokens only. Shared by readingTime + wordCount.
function countWords(md) {
  return (md.match(/\S+/g) || []).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

// Mirror of render.js: rough reading time at ~200 wpm.
function readingTime(md, lang) {
  const minutes = Math.max(1, Math.round(countWords(md) / 200));
  return MIN_READ[lang](minutes);
}

// Mirror of render.js wiki resolution, so [[links]] map to the same slugs.
const wikiMap = new Map();
const normalizeWiki = (s) =>
  s.toLowerCase().replace(/[‐-―]/g, "-").replace(/\s+/g, " ").trim();
for (const p of blogView) {
  wikiMap.set(normalizeWiki(p.slug), p.slug);
  const titles = typeof p.name === "string" ? [p.name] : Object.values(p.name);
  for (const t of titles) wikiMap.set(normalizeWiki(t), p.slug);
  for (const a of p.aliases ?? []) wikiMap.set(normalizeWiki(a), p.slug);
}
const resolveWiki = (name) => wikiMap.get(normalizeWiki(name)) ?? null;

async function readPostBody(slug, lang) {
  const file = path.join(ROOT, "posts", `${slug}.${lang}.md`);
  if (!existsSync(file)) return null;
  return readFile(file, "utf8");
}

function isoDate(date) {
  return new Date(`${date}T00:00:00Z`).toISOString();
}

function rfc822(date) {
  return new Date(`${date}T00:00:00Z`).toUTCString();
}

// en lives at /blog/<slug>/, other languages at /blog/<slug>/<lang>/.
function pagePath(slug, lang) {
  return lang === DEFAULT_LANG ? `/blog/${slug}/` : `/blog/${slug}/${lang}/`;
}

// Blog hub: en at /blog/, other languages at /blog/<lang>/.
function blogIndexPath(lang) {
  return lang === DEFAULT_LANG ? `/blog/` : `/blog/${lang}/`;
}

/* ----------------------------------------------------- per-post HTML page */

// "Part of the <series> series" nav: every post in the series, in reading order,
// linking to the right-language page (falling back to the default language when a
// sibling has no translation). Returns "" when the post has no series or stands
// alone. slugLangs maps slug -> available language codes.
function renderSeriesNav(post, lang, slugLangs) {
  if (!post.series) return "";
  const siblings = blogView
    .filter((p) => p.series === post.series)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (siblings.length < 2) return "";

  const items = siblings
    .map((p) => {
      const label = getTranslated(p.name, lang);
      if (p.slug === post.slug) {
        return `          <li aria-current="true"><strong>${escAttr(label)}</strong> <span class="series-here">— ${escAttr(SERIES_CURRENT[lang] ?? SERIES_CURRENT[DEFAULT_LANG])}</span></li>`;
      }
      const sibLangs = slugLangs.get(p.slug) ?? [DEFAULT_LANG];
      const linkLang = sibLangs.includes(lang) ? lang : DEFAULT_LANG;
      return `          <li><a href="${pagePath(p.slug, linkLang)}">${escAttr(label)}</a></li>`;
    })
    .join("\n");

  const heading = (SERIES_LABEL[lang] ?? SERIES_LABEL[DEFAULT_LANG])(post.series);
  return `
        <nav class="article-series" aria-label="${escAttr(heading)}">
          <p class="article-series-title">${escAttr(heading)}</p>
          <ol>
${items}
          </ol>
        </nav>`;
}

function renderArticleHtml(post, lang, md, langs, ogImage, slugLangs) {
  const title = getTranslated(post.name, lang);
  const desc = getTranslated(post.desc, lang);
  const url = ORIGIN + pagePath(post.slug, lang);
  const blogHref = blogIndexPath(lang);
  const tags = post.tags ?? [];

  // Render with the browser's renderer, then point internal post links at the
  // static pages instead of the SPA query-param route, for crawlable linking.
  let bodyHtml = renderMarkdown(md, { resolveWiki }).replace(
    /href="\/\?v=blog&(?:amp;)?post=([^"&]+)"/g,
    (_, s) => `href="/blog/${s}/"`,
  );

  const metaBits = [post.date, tags.join(" · "), readingTime(md, lang)].filter(Boolean);

  // hreflang alternates (+ x-default pointing at the default language).
  const alternates = langs
    .map(
      (l) =>
        `    <link rel="alternate" hreflang="${l}" href="${ORIGIN}${pagePath(post.slug, l)}">`,
    )
    .concat(
      `    <link rel="alternate" hreflang="x-default" href="${ORIGIN}${pagePath(post.slug, DEFAULT_LANG)}">`,
    )
    .join("\n");

  const tagMeta = tags
    .map((t) => `    <meta property="article:tag" content="${escAttr(t)}">`)
    .join("\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: desc,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: lang,
    author: { "@type": "Person", name: AUTHOR, url: AUTHOR_URL },
    publisher: { "@type": "Person", name: AUTHOR, url: AUTHOR_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    wordCount: countWords(md),
    isAccessibleForFree: true,
    copyrightHolder: { "@type": "Person", name: AUTHOR, url: AUTHOR_URL },
    copyrightYear: Number(post.date.slice(0, 4)),
    keywords: tags.join(", "),
  };
  if (ogImage) jsonLd.image = ORIGIN + ogImage;
  if (post.series) jsonLd.articleSection = post.series;

  // Breadcrumb trail (Home → Blog → this post) for breadcrumb rich results.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: ORIGIN + "/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: ORIGIN + "/blog/" },
      { "@type": "ListItem", position: 3, name: title, item: url },
    ],
  };

  let sourceHtml = "";
  if (post.source) {
    const [prefix, label] = ALSO_PUBLISHED[lang];
    sourceHtml = `\n      <p class="article-source">${escAttr(prefix)}<a href="${escAttr(post.source)}" target="_blank" rel="noopener noreferrer">${escAttr(label)}</a>.</p>`;
  }

  const tuiHref =
    lang === DEFAULT_LANG
      ? `/?v=blog&post=${post.slug}`
      : `/?v=blog&post=${post.slug}&l=${lang}`;

  const seriesNav = renderSeriesNav(post, lang, slugLangs);

  // og:image (absolute URL — unfurlers require it) + large Twitter card when a
  // card image exists; otherwise fall back to the plain summary card.
  const imageMeta = ogImage
    ? `    <meta property="og:image" content="${ORIGIN}${ogImage}" />
    <meta property="og:image:width" content="${OG_W}" />
    <meta property="og:image:height" content="${OG_H}" />
    <meta property="og:image:alt" content="${escAttr(title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${ORIGIN}${ogImage}" />`
    : `    <meta name="twitter:card" content="summary" />`;

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0b0f0c" />
    <link rel="icon" type="image/x-icon" href="/icon.ico" />
    <title>${escAttr(title)} — ${SITE_NAME}</title>
    <meta name="description" content="${escAttr(desc)}" />
    <meta name="author" content="${escAttr(AUTHOR)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${url}" />
${alternates}
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${escAttr(title)}" />
    <meta property="og:description" content="${escAttr(desc)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="${LOCALES[lang] ?? lang}" />
    <meta property="article:published_time" content="${isoDate(post.date)}" />
    <meta name="copyright" content="${escAttr(copyrightLine(lang, post.date.slice(0, 4)))}" />
${tagMeta}
${imageMeta}
    <meta name="twitter:title" content="${escAttr(title)}" />
    <meta name="twitter:description" content="${escAttr(desc)}" />
    <link rel="alternate" type="application/rss+xml" title="${SITE_NAME} blog" href="/feed.xml" />
    <link rel="alternate" type="application/feed+json" title="${SITE_NAME} blog" href="/feed.json" />
    <link rel="stylesheet" href="/css/base.css" />
    <link rel="stylesheet" href="/css/article.css" />
    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
    </script>
    <script type="application/ld+json">
${JSON.stringify(breadcrumbLd, null, 2)}
    </script>
  </head>
  <body>
    <main class="article-page">
      <nav class="article-nav">
        <a href="${blogHref}">${escAttr(BACK_TO_BLOG[lang])}</a> · <a href="/">${SITE_NAME}</a>
      </nav>
      <article class="article">
        <h1>${escAttr(title)}</h1>
        <p class="article-meta">${escAttr(metaBits.join("  —  "))}</p>
        ${bodyHtml}${sourceHtml}${seriesNav}
        <p class="open-tui"><a href="${escAttr(tuiHref)}">${escAttr(OPEN_TUI[lang])}</a></p>
      </article>
      <footer class="page-footer">${escAttr(copyrightLine(lang, post.date.slice(0, 4)))}</footer>
    </main>
  </body>
</html>
`;
}

/* ------------------------------------------------------------- blog hub */

// A crawlable listing of every post at /blog/ (en) and /blog/<lang>/ (others):
// the human landing page and internal-linking hub that ties the posts together.
// `langs` are the languages a hub is emitted in (for hreflang), `slugLangs` maps
// slug -> available post languages, and `readingMap` maps `${slug}:${lang}` to a
// reading-time label — both precomputed in main so bodies aren't re-read here.
function renderBlogIndexHtml(posts, lang, langs, slugLangs, readingMap) {
  const strings = BLOG_INDEX[lang] ?? BLOG_INDEX[DEFAULT_LANG];
  const url = ORIGIN + blogIndexPath(lang);
  const ogImage = `${ORIGIN}/og/home.png`;

  // Pick the best language for a post's link: the requested one, else default.
  const linkLangFor = (p) => {
    const sib = slugLangs.get(p.slug) ?? [DEFAULT_LANG];
    return sib.includes(lang) ? lang : DEFAULT_LANG;
  };

  const items = posts
    .map((p) => {
      const linkLang = linkLangFor(p);
      const title = getTranslated(p.name, linkLang);
      const href = pagePath(p.slug, linkLang);
      const series = p.series
        ? `<span class="post-series">[${escAttr(p.series)}] </span>`
        : "";
      const metaParts = [p.date, (p.tags ?? []).join(" · ")];
      const reading = readingMap.get(`${p.slug}:${linkLang}`);
      if (reading) metaParts.push(reading);
      return `        <li>
          ${series}<a href="${href}"><strong>${escAttr(title)}</strong></a>
          <span class="post-meta">${escAttr(metaParts.filter(Boolean).join("  ·  "))}</span>
          <p>${escAttr(getTranslated(p.desc, linkLang))}</p>
        </li>`;
    })
    .join("\n");

  const alternates = langs
    .map(
      (l) =>
        `    <link rel="alternate" hreflang="${l}" href="${ORIGIN}${blogIndexPath(l)}">`,
    )
    .concat(
      `    <link rel="alternate" hreflang="x-default" href="${ORIGIN}${blogIndexPath(DEFAULT_LANG)}">`,
    )
    .join("\n");

  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": url,
    name: `${strings.title} — ${SITE_NAME}`,
    description: strings.desc,
    url,
    inLanguage: lang,
    author: { "@type": "Person", name: AUTHOR, url: AUTHOR_URL },
    copyrightHolder: { "@type": "Person", name: AUTHOR, url: AUTHOR_URL },
    blogPost: posts.map((p) => {
      const linkLang = linkLangFor(p);
      return {
        "@type": "BlogPosting",
        headline: getTranslated(p.name, linkLang),
        url: ORIGIN + pagePath(p.slug, linkLang),
        datePublished: p.date,
      };
    }),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: ORIGIN + "/" },
      { "@type": "ListItem", position: 2, name: strings.title, item: url },
    ],
  };

  const tuiHref = lang === DEFAULT_LANG ? "/?v=blog" : `/?v=blog&l=${lang}`;

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0b0f0c" />
    <link rel="icon" type="image/x-icon" href="/icon.ico" />
    <title>${strings.title} — ${SITE_NAME}</title>
    <meta name="description" content="${escAttr(strings.desc)}" />
    <meta name="author" content="${escAttr(AUTHOR)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${url}" />
${alternates}
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${escAttr(strings.title)} — ${SITE_NAME}" />
    <meta property="og:description" content="${escAttr(strings.desc)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="${LOCALES[lang] ?? lang}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="${OG_W}" />
    <meta property="og:image:height" content="${OG_H}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:title" content="${escAttr(strings.title)} — ${SITE_NAME}" />
    <meta name="twitter:description" content="${escAttr(strings.desc)}" />
    <meta name="copyright" content="${escAttr(copyrightLine(lang))}" />
    <link rel="alternate" type="application/rss+xml" title="${SITE_NAME} blog" href="/feed.xml" />
    <link rel="alternate" type="application/feed+json" title="${SITE_NAME} blog" href="/feed.json" />
    <link rel="stylesheet" href="/css/base.css" />
    <link rel="stylesheet" href="/css/article.css" />
    <script type="application/ld+json">
${JSON.stringify(blogLd, null, 2)}
    </script>
    <script type="application/ld+json">
${JSON.stringify(breadcrumbLd, null, 2)}
    </script>
  </head>
  <body>
    <main class="article-page">
      <nav class="article-nav">
        <a href="/">${SITE_NAME}</a>
      </nav>
      <div class="article">
        <h1>${escAttr(strings.title)}</h1>
        <p class="article-meta">${escAttr(strings.intro)}</p>
      </div>
      <ul class="blog-index">
${items}
      </ul>
      <p class="open-tui"><a href="${escAttr(tuiHref)}">${escAttr(OPEN_TUI[lang])}</a></p>
      <footer class="page-footer">${escAttr(copyrightLine(lang))}</footer>
    </main>
  </body>
</html>
`;
}

/* -------------------------------------------------------- sitemap / feed */

function renderSitemap(entries, blogLangs, blogLastmod) {
  const blogAlts = blogLangs
    .map(
      (l) =>
        `    <xhtml:link rel="alternate" hreflang="${l}" href="${ORIGIN}${blogIndexPath(l)}"/>`,
    )
    .concat(
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${blogIndexPath(DEFAULT_LANG)}"/>`,
    )
    .join("\n");
  const blogUrls = blogLangs
    .map(
      (l) => `  <url>
    <loc>${ORIGIN}${blogIndexPath(l)}</loc>
    <lastmod>${blogLastmod}</lastmod>
${blogAlts}
  </url>`,
    )
    .join("\n");

  const urls = entries
    .map((e) => {
      const alts = e.langs
        .map(
          (l) =>
            `    <xhtml:link rel="alternate" hreflang="${l}" href="${ORIGIN}${pagePath(e.slug, l)}"/>`,
        )
        .concat(
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${pagePath(e.slug, DEFAULT_LANG)}"/>`,
        )
        .join("\n");
      return `  <url>
    <loc>${ORIGIN}${pagePath(e.slug, e.lang)}</loc>
    <lastmod>${e.date}</lastmod>
${alts}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${ORIGIN}/</loc>
  </url>
${blogUrls}
${urls}
</urlset>
`;
}

// AI / LLM crawlers to keep out: model-training + dataset scrapers, plus the
// AI-answer bots that republish content. Search engines are NOT listed here, so
// they still fall under the permissive `*` group below. robots.txt is advisory —
// compliant bots (these are) obey it; a hostile scraper can still ignore it.
const AI_CRAWLERS = [
  "GPTBot",            // OpenAI training
  "OAI-SearchBot",     // OpenAI (ChatGPT search)
  "ChatGPT-User",      // OpenAI (user-triggered fetch)
  "Google-Extended",   // Google Gemini/Vertex training (NOT Googlebot search)
  "CCBot",             // Common Crawl (feeds many LLM datasets)
  "ClaudeBot",         // Anthropic
  "anthropic-ai",      // Anthropic (legacy)
  "Claude-Web",        // Anthropic
  "PerplexityBot",     // Perplexity
  "Bytespider",        // ByteDance
  "Amazonbot",         // Amazon
  "Applebot-Extended", // Apple AI training (NOT Applebot search)
  "Meta-ExternalAgent", // Meta AI
  "Diffbot",
  "Omgilibot",
  "cohere-ai",         // Cohere
];

function renderRobots() {
  const aiBlock = AI_CRAWLERS.map((ua) => `User-agent: ${ua}`).join("\n");
  return `# Search engines welcome.
User-agent: *
Allow: /

# AI / LLM training and scraping crawlers: not welcome.
${aiBlock}
Disallow: /

Sitemap: ${ORIGIN}/sitemap.xml
`;
}

function renderFeed(posts) {
  // Deterministic build date: the newest post, not wall-clock, so re-running the
  // generator on unchanged content produces an identical feed (no spurious diffs).
  const buildDate = posts.length ? rfc822(posts[0].date) : rfc822("1970-01-01");
  const items = posts
    .map((p) => {
      const title = getTranslated(p.name, DEFAULT_LANG);
      const desc = getTranslated(p.desc, DEFAULT_LANG);
      const url = ORIGIN + pagePath(p.slug, DEFAULT_LANG);
      const cats = (p.tags ?? [])
        .map((t) => `      <category>${escXml(t)}</category>`)
        .join("\n");
      return `    <item>
      <title>${escXml(title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${escXml(desc)}</description>
${cats}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${ORIGIN}/</link>
    <description>${FEED_DESC}</description>
    <language>en</language>
    <copyright>© ${AUTHOR}. ${RIGHTS.en}</copyright>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

// JSON Feed 1.1 (https://jsonfeed.org) — a modern alternative to RSS accepted by
// many readers (NetNewsWire, Feedbin, …). Mirrors renderFeed: English titles,
// summaries and dates, newest first.
function renderJsonFeed(posts) {
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: SITE_NAME,
    home_page_url: `${ORIGIN}/`,
    feed_url: `${ORIGIN}/feed.json`,
    description: FEED_DESC,
    language: "en",
    authors: [{ name: AUTHOR, url: AUTHOR_URL }],
    items: posts.map((p) => {
      const url = ORIGIN + pagePath(p.slug, DEFAULT_LANG);
      const desc = getTranslated(p.desc, DEFAULT_LANG);
      const item = {
        id: url,
        url,
        title: getTranslated(p.name, DEFAULT_LANG),
        summary: desc,
        content_html: `<p>${escXml(desc)}</p>`,
        date_published: isoDate(p.date),
      };
      if (p.tags?.length) item.tags = p.tags;
      return item;
    }),
  };
  return `${JSON.stringify(feed, null, 2)}\n`;
}

// Crawlable, no-JS fallback list injected into index.html between markers.
function renderNoscriptList(posts) {
  const items = posts
    .map((p) => {
      const title = getTranslated(p.name, DEFAULT_LANG);
      return `        <li><a href="${pagePath(p.slug, DEFAULT_LANG)}">${escAttr(title)}</a> — ${escAttr(getTranslated(p.desc, DEFAULT_LANG))}</li>`;
    })
    .join("\n");
  return `      <h1>${SITE_NAME}</h1>
      <p>A terminal-style personal site by ${escAttr(AUTHOR)}. This page needs JavaScript for the interactive UI; the blog posts are readable directly:</p>
      <ul>
${items}
      </ul>
      <p><a href="/blog/">All posts →</a></p>`;
}

/* ----------------------------------------------------------------- main */

async function main() {
  const posts = [...blogView].sort((a, b) => (a.date < b.date ? 1 : -1));
  const sitemapEntries = [];
  const readingMap = new Map();
  let pageCount = 0;
  let cardCount = 0;

  const ogDir = path.join(ROOT, "og");
  await mkdir(ogDir, { recursive: true });

  // Landing-page card.
  if (rasterize(homeCardSvg({ subtitle: SITE_TAGLINE }), path.join(ogDir, "home.png"))) {
    cardCount++;
  }

  // Which languages each post has, precomputed so a series nav can link its
  // siblings in the right language (falling back to the default when absent).
  const slugLangs = new Map();
  for (const post of posts) {
    const langs = [];
    for (const lang of ["en", "ru"]) {
      if (await readPostBody(post.slug, lang)) langs.push(lang);
    }
    slugLangs.set(post.slug, langs);
  }

  for (const post of posts) {
    const langs = slugLangs.get(post.slug);
    if (langs.length === 0) {
      console.warn(`! ${post.slug}: no markdown body found, skipping`);
      continue;
    }

    for (const lang of langs) {
      const md = await readPostBody(post.slug, lang);
      readingMap.set(`${post.slug}:${lang}`, readingTime(md, lang));

      // Per-post OG card (one per language so the title matches).
      const cardName = lang === DEFAULT_LANG ? `${post.slug}.png` : `${post.slug}.${lang}.png`;
      const svg = postCardSvg({
        title: getTranslated(post.name, lang),
        tags: post.tags ?? [],
        date: post.date,
        slug: post.slug,
      });
      const ogImage = rasterize(svg, path.join(ogDir, cardName))
        ? `/og/${cardName}`
        : null;
      if (ogImage) cardCount++;

      const html = renderArticleHtml(post, lang, md, langs, ogImage, slugLangs);
      const outDir = path.join(
        ROOT,
        "blog",
        post.slug,
        lang === DEFAULT_LANG ? "" : lang,
      );
      await mkdir(outDir, { recursive: true });
      await writeFile(path.join(outDir, "index.html"), html);
      sitemapEntries.push({ slug: post.slug, lang, date: post.date, langs });
      pageCount++;
    }
  }

  // Blog hub pages: en at /blog/, other locales at /blog/<lang>/. A language gets
  // a hub only if at least one generated post exists in it.
  const livePosts = posts.filter((p) => (slugLangs.get(p.slug) ?? []).length > 0);
  const hubLangs = ["en", "ru"].filter((l) =>
    livePosts.some((p) => (slugLangs.get(p.slug) ?? []).includes(l)),
  );
  const blogLastmod = livePosts.length ? livePosts[0].date : "1970-01-01";
  for (const lang of hubLangs) {
    const html = renderBlogIndexHtml(livePosts, lang, hubLangs, slugLangs, readingMap);
    const outDir = path.join(ROOT, "blog", lang === DEFAULT_LANG ? "" : lang);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "index.html"), html);
    pageCount++;
  }

  await writeFile(
    path.join(ROOT, "sitemap.xml"),
    renderSitemap(sitemapEntries, hubLangs, blogLastmod),
  );
  await writeFile(path.join(ROOT, "robots.txt"), renderRobots());
  await writeFile(path.join(ROOT, "feed.xml"), renderFeed(posts));
  await writeFile(path.join(ROOT, "feed.json"), renderJsonFeed(posts));

  // Refresh the <noscript> block in index.html between the SEO markers.
  const indexPath = path.join(ROOT, "index.html");
  const index = await readFile(indexPath, "utf8");
  const block = renderNoscriptList(posts);
  const updated = index.replace(
    /(<!-- SEO:noscript:start -->)[\s\S]*?(<!-- SEO:noscript:end -->)/,
    `$1\n${block}\n      $2`,
  );
  if (updated !== index) await writeFile(indexPath, updated);

  console.log(
    `✓ ${pageCount} pages (incl. ${hubLangs.length} blog hub), ${cardCount} OG cards, sitemap (${sitemapEntries.length + hubLangs.length + 1} urls), robots.txt, feed.xml`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
