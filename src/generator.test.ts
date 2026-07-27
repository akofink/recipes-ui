import { diffChanges, fullGeneration } from "../scripts/lib/generate";
import {
  compareCommits,
  fetchMarkdown,
  listImagesFor,
  listRecipes,
} from "../scripts/lib/github";

jest.mock("../scripts/lib/github", () => ({
  branchHeadSha: jest.fn(),
  compareCommits: jest.fn(),
  fetchMarkdown: jest.fn(),
  latestCommitShaForPath: jest.fn(),
  listImagesFor: jest.fn(),
  listRecipes: jest.fn(),
}));
jest.mock("../scripts/lib/markdown", () => ({
  markdownToHtml: jest.fn(async (markdown: string) => `<h1>${markdown}</h1>`),
  withHtmlFromMarkdown: jest.fn(),
}));

const mockedCompareCommits = jest.mocked(compareCommits);
const mockedFetchMarkdown = jest.mocked(fetchMarkdown);
const mockedListImagesFor = jest.mocked(listImagesFor);
const mockedListRecipes = jest.mocked(listRecipes);

test("rejects compare responses without file lists", async () => {
  mockedCompareCommits
    .mockResolvedValueOnce({ files: [{ filename: "recipes/new.md" }] })
    .mockResolvedValueOnce({});

  await expect(diffChanges("old", "old", "new", "new")).rejects.toThrow(
    "complete file list",
  );
});

test("rejects compare responses at GitHub's file truncation limit", async () => {
  mockedCompareCommits
    .mockResolvedValueOnce({
      files: Array.from({ length: 300 }, (_, index) => ({
        filename: `recipes/recipe-${index}.md`,
      })),
    })
    .mockResolvedValueOnce({ files: [] });

  await expect(diffChanges("old", "old", "new", "new")).rejects.toThrow(
    "complete file list",
  );
});

test("full generation uses only recipes in the upstream directory", async () => {
  mockedListRecipes.mockResolvedValue([
    { filename: "renamed.md", name: "renamed" },
  ]);
  mockedFetchMarkdown.mockResolvedValue("# Renamed");
  mockedListImagesFor.mockResolvedValue(["finished.jpg"]);

  await expect(fullGeneration()).resolves.toEqual([
    expect.objectContaining({
      filename: "renamed.md",
      name: "renamed",
      imageName: "finished.jpg",
      markdown: "# Renamed",
    }),
  ]);
});
