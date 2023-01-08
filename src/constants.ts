export const GITHUB_RO_APP_TOKEN =
  "YWtvZmluazpnaXRodWJfcGF0XzExQUFGMkFRWTBmY0dCSnBKaGVpWjVfbG1BSU4yZFptcmpFWHVOV3VKNWdacmxoSzF5QU8zbnJTekV5TkkzbFYzRTI0NVlOMlpKV0haTlh1T1E=";
export const GITHUB_FETCH_AUTH = {
  Authorization: `Basic ${GITHUB_RO_APP_TOKEN}`,
};

export const GITHUB_API_URL = "https://api.github.com";
export const GITHUB_RAW_URL = "https://raw.githubusercontent.com";

export const RECIPESMD_CONTENTS = `${GITHUB_API_URL}/repos/akofink/recipes-md/contents`;
export const RECIPESMD_RAW = `${GITHUB_RAW_URL}/akofink/recipes-md/main`;
