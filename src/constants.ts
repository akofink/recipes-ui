export const GITHUB_RO_APP_TOKEN =
  "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";
export const GITHUB_FETCH_AUTH = {
  Authorization: `Basic ${GITHUB_RO_APP_TOKEN}`,
};

export const GITHUB_API_URL = "https://api.github.com";
export const GITHUB_RAW_URL = "https://raw.githubusercontent.com";

export const RECIPESMD_CONTENTS = `${GITHUB_API_URL}/repos/akofink/recipes-md/contents`;
export const RECIPESMD_RAW = `${GITHUB_RAW_URL}/akofink/recipes-md/main`;
