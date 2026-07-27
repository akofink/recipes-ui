/** @jest-environment node */

import { listRecipes } from "../scripts/lib/github";

afterEach(() => {
  jest.restoreAllMocks();
});

test("distinguishes a failed recipe listing from an empty directory", async () => {
  jest
    .spyOn(global, "fetch")
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(
      new Response("[]", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

  await expect(listRecipes()).rejects.toThrow(
    "Unable to list upstream recipes",
  );
  await expect(listRecipes()).resolves.toEqual([]);
});
