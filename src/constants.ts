export const GITHUB_RO_APP_TOKEN =
  "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";
export const GITHUB_FETCH_AUTH = {
  Authorization: `Basic ${GITHUB_RO_APP_TOKEN}`,
};

export const GITHUB_API_URL = "https://api.github.com";
export const GITHUB_RAW_URL = "https://raw.githubusercontent.com";

export const RECIPESMD_CONTENTS = `${GITHUB_API_URL}/repos/akofink/recipes-md/contents`;
export const RECIPESMD_RAW = `${GITHUB_RAW_URL}/akofink/recipes-md/main`;
