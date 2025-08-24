import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";

// Google Analytics injection
(function initGA() {
  try {
    const GA_ID = 'G-0WWZ7MSYKW';
    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (!GA_ID || isLocal) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).gtag = function() { (window as any).dataLayer.push(arguments); };
    (window as any).gtag('js', new Date());
    (window as any).gtag('config', GA_ID);
  } catch (e) {
    // no-op
  }
})();
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import routes from './routes';

const router = createBrowserRouter(routes);

ReactDOM.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
  document.getElementById("root")
);
