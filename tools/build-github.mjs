// GitHub stats generator.
//
// Writes data/github.json: star counts of the projects' GitHub source repos and
// merged PR counts behind the contribution links. The projects page reads this
// file, so visitors never hit the GitHub API and its per-IP rate limits. A
// request that fails keeps the previous value. GITHUB_TOKEN, when set,
// authenticates the requests. Run via `make github` / `npm run github`; CI
// re-runs it on project changes and daily (.github/workflows/seo.yml).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { projects, contributions } from "../js/content/projects.js";
import { GITHUB_STATS_PATH, MERGED_PRS_QUERY, sourceRepo, prsRepo } from "../js/github.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, GITHUB_STATS_PATH);
const API = "https://api.github.com";

async function api(endpoint) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "mxmgorin.dev-build" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(API + endpoint, { headers });
  if (!res.ok) throw new Error(`${endpoint}: HTTP ${res.status}`);
  return res.json();
}

async function readPrevious() {
  try {
    return JSON.parse(await readFile(OUT, "utf8"));
  } catch {
    return {};
  }
}

// Fetches a value per unique key, falling back to `previous` on failure;
// returns the values keyed in sorted order.
async function collect(keys, previous = {}, fetchOne) {
  const out = {};
  for (const key of [...new Set(keys)].sort()) {
    try {
      out[key] = await fetchOne(key);
    } catch (err) {
      console.warn(`! ${err.message}; keeping ${previous[key] ?? "nothing"}`);
      if (key in previous) out[key] = previous[key];
    }
  }
  return out;
}

async function main() {
  const items = [...projects, ...contributions];
  const previous = await readPrevious();

  const stars = await collect(
    items.map(sourceRepo).filter(Boolean),
    previous.stars,
    async (repo) => (await api(`/repos/${repo}`)).stargazers_count,
  );
  const mergedPrs = await collect(
    items.map(prsRepo).filter(Boolean),
    previous.mergedPrs,
    async (repo) => {
      const q = encodeURIComponent(`repo:${repo} ${MERGED_PRS_QUERY}`);
      return (await api(`/search/issues?q=${q}&per_page=1`)).total_count;
    },
  );

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify({ stars, mergedPrs }, null, 2)}\n`);
  console.log(
    `✓ ${Object.keys(stars).length} star counts, ${Object.keys(mergedPrs).length} merged PR counts -> ${GITHUB_STATS_PATH}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
