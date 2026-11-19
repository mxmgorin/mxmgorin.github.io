// GitHub links of projects and the stats file built from them.
// Free of browser APIs: the Node build tools import it too.
import { githubUser } from "./content/projects.js";

const GITHUB_REPO_URL = /^https:\/\/github\.com\/([^/]+)\/([^/?#]+)/;

export const MERGED_PRS_QUERY = `is:pr is:merged author:${githubUser}`;

// Path of the star and merged PR counts, keyed by owner/repo, from the site root.
export const GITHUB_STATS_PATH = "data/github.json";

// The owner/repo of an item's GitHub `source` link; null when there is none.
export function sourceRepo(item) {
  const match = item.links?.find((l) => l.label === "source")?.url.match(GITHUB_REPO_URL);
  return match ? `${match[1]}/${match[2]}` : null;
}

// The owner/repo behind an item's merged PRs link; null when there is none.
export function prsRepo(item) {
  return item.links?.find((l) => l.prs)?.prs ?? null;
}

export function mergedPrsUrl(repo) {
  return `https://github.com/${repo}/pulls?q=${encodeURIComponent(MERGED_PRS_QUERY)}`;
}
