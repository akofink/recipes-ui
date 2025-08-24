import { StrictMode } from "react";
import ReactDOM from "react-dom";
// Include Bootstrap CSS from node_modules to avoid compiling SCSS
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import "./App.css";

// Google Analytics injection
(function initGA() {
  try {
    const GA_ID = "G-0WWZ7MSYKW";
    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(
      location.hostname,
    );
    if (!GA_ID || isLocal) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
    const w = window as unknown as {
      dataLayer: unknown[];
      gtag: (...args: unknown[]) => void;
    };
    w.dataLayer = w.dataLayer || [];
    w.gtag = (...args: unknown[]) => {
      w.dataLayer.push(args);
    };
    w.gtag("js", new Date());
    w.gtag("config", GA_ID);
  } catch (e) {
    // no-op
  }
})();
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import routes from "./routes";

const router = createBrowserRouter(routes);

ReactDOM.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
  document.getElementById("root"),
);
