import App from "./App";
import Error from './layouts/error'
import { Recipe } from "./layouts/recipe";

export default [
  {
    path: "/",
    element: <App />,
    errorElement: <Error />,
  },
  {
    path: "/:fileBasename",
    element: <Recipe />,
  },
];
