import { StrictMode } from "react";
import ReactDOM from "react-dom";
// Include Bootstrap CSS from node_modules to avoid compiling SCSS
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import "./App.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import routes from "./routes";

const router = createBrowserRouter(routes);

ReactDOM.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
  document.getElementById("root"),
);
