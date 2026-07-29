import { lazy, ReactElement, Suspense } from "react";
import { findRecipe } from "./services/recipes";

const App = lazy(() => import("./App"));
const Recipe = lazy(() =>
  import("./layouts/recipe").then((m) => ({ default: m.Recipe })),
);
const NotFound = lazy(() => import("./layouts/not-found"));

const suspense = (el: ReactElement) => (
  <Suspense fallback={<div>Loading…</div>}>{el}</Suspense>
);

const recipeLoader = async ({
  params,
}: {
  params: { fileBasename?: string };
}) => {
  const name = (params.fileBasename || "").replace(/\/$/, "");
  const filename = `${name}.md`;

  try {
    const recipe = await findRecipe(filename);
    if (!recipe) {
      throw new Response("Not Found", { status: 404 });
    }
    return null;
  } catch (error) {
    console.error("Error loading recipe:", error);
    throw new Response("Not Found", { status: 404 });
  }
};

export default [
  {
    errorElement: suspense(<NotFound />),
    children: [
      {
        index: true,
        element: suspense(<App />),
      },
      {
        path: "/:fileBasename",
        element: suspense(<Recipe />),
        loader: recipeLoader,
      },
    ],
  },
];
