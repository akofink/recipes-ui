export const GITHUB_RO_APP_TOKEN =
  "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";
export const GITHUB_FETCH_AUTH = {
  Authorization: `Basic ${GITHUB_RO_APP_TOKEN}`,
};

export const GITHUB_API_URL = "https://api.github.com";
export const GITHUB_RAW_URL = "https://raw.githubusercontent.com";

export const RECIPESMD_CONTENTS = `${GITHUB_API_URL}/repos/akofink/recipes-md/contents`;
export const RECIPESMD_RAW = `${GITHUB_RAW_URL}/akofink/recipes-md/main`;
