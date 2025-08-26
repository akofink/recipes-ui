export const GH_API = "https://api.github.com";
export const OWNER = "akofink";
export const REPO = "recipes-md";
export const BRANCH = "main";

export const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`;
export const CONTENTS_BASE = `${GH_API}/repos/${OWNER}/${REPO}/contents`;
export const COMMITS_BASE = `${GH_API}/repos/${OWNER}/${REPO}/commits`;
export const COMPARE_BASE = `${GH_API}/repos/${OWNER}/${REPO}/compare`;

export const SCHEMA_VERSION = 3 as const;

export function authHeaders(): Record<string, string> {
  const token =
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.RECIPES_GITHUB_TOKEN;
  return token ? { Authorization: `token ${token}` } : {};
}

export const MAX_WAIT_MS: number = Number.parseInt(
  process.env.GENERATE_MAX_WAIT_MS || "120000",
  10,
);
