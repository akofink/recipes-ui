export type GithubFile = {
  filename?: string;
  name?: string;
  imageDir?: string;
};

export type RecipeData = {
  name: string;
  filename: string;
  imageName: string | null;
  imageNames?: string[];
  markdown: string;
};
