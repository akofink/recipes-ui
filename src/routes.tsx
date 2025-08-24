import { lazy, Suspense } from "react";

const App = lazy(() => import("./App"));
const Error = lazy(() => import("./layouts/error"));
const Recipe = lazy(() =>
  import("./layouts/recipe").then((m) => ({ default: m.Recipe })),
);
const NotFound = lazy(() => import("./layouts/not-found"));

const suspense = (el: JSX.Element) => (
  <Suspense fallback={<div>Loading…</div>}>{el}</Suspense>
);

export default [
  {
    path: "/",
    element: suspense(<App />),
    errorElement: suspense(<Error />),
  },
  {
    path: "/:fileBasename",
    element: suspense(<Recipe />),
  },
  {
    path: "*",
    element: suspense(<NotFound />),
  },
];
