import { lazy, Suspense } from "react";
import recipesData from "./generated/recipes.json";

const App = lazy(() => import("./App"));
const Recipe = lazy(() =>
  import("./layouts/recipe").then((m) => ({ default: m.Recipe })),
);

const suspense = (el: JSX.Element) => (
  <Suspense fallback={<div>Loading…</div>}>{el}</Suspense>
);

const recipeLoader = ({ params }: { params: { fileBasename?: string } }) => {
  const name = (params.fileBasename || "").replace(/\/$/, "");
  const filename = `${name}.md`;
  const list = (recipesData as unknown as Array<{ filename: string }>) || [];
  const exists = list.some((r) => r.filename === filename);
  if (!exists) {
    throw new Response("Not Found", { status: 404 });
  }
  return null;
};

export default [
  {
    path: "/",
    element: suspense(<App />),
  },
  {
    path: "/:fileBasename",
    element: suspense(<Recipe />),
    loader: recipeLoader,
  },
];
