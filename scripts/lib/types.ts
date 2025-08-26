export interface Recipe {
  name: string;
  filename: string;
  imageName: string | null;
  imageNames: string[];
  markdown?: string;
  html?: string;
}

export interface GenerationMeta {
  schemaVersion: number;
  source: {
    owner: string;
    repo: string;
    branch: string;
    recipesSha: string | null;
    imagesSha: string | null;
  };
  generatedAt: string;
  count: number;
}

export interface GhCommit {
  sha: string;
}

export type GhCompareStatus = "added" | "modified" | "removed" | "renamed";
export interface GhCompareFile {
  filename: string;
  status?: GhCompareStatus;
  previous_filename?: string;
}
export interface GhCompare {
  files?: GhCompareFile[];
}

export interface GhContentItem {
  name: string;
}
