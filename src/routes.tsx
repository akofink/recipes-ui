import App from "./App";

export default [
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/:filename",
    element: <App />,
  },
];
