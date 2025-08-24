import { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import Navigation from "./navigation";

const NotFound: FC = () => {
  const location = useLocation();
  return (
    <Navigation>
      <div style={{ padding: "2rem 0" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>404 – Not Found</h1>
        <p style={{ marginBottom: "1rem" }}>
          Sorry, we couldn’t find a recipe for &quot;
          {location.pathname.replace(/^\//, "")}&quot;.
        </p>
        <Link to="/">Go back to recipes</Link>
      </div>
    </Navigation>
  );
};

export default NotFound;
