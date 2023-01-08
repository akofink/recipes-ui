import { GITHUB_FETCH_AUTH } from "../constants";
import { GithubFile } from "../types";

export const jsonToFiles: (files: GithubFile[]) => GithubFile[] = (files) =>
  files.map((json) => ({
    ...json,
    name: (json.name ?? "").replace(/.md$/, ""),
  }));

export const fetchWithGithubAuth: typeof fetch = (url, args) =>
  fetch(url, { ...args, headers: GITHUB_FETCH_AUTH });

export const fetchWithGithubAuthToJson: (
  url: RequestInfo,
  args?: RequestInit
) => Promise<GithubFile[]> = (url, args) =>
  fetchWithGithubAuth(url, args)
    .catch()
    .then((response) => response.status < 400 ? response.json() : []
  );
