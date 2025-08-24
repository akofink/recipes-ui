import { FC } from "react";
import { Link } from "react-router-dom";
import Navigation from "./navigation";

const NotFound: FC = () => {
  // no-op
  return (
    <Navigation>
      <div style={{ padding: "2rem 0" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>404 – Page Not Found</h1>
        <p style={{ marginBottom: "1rem" }}>
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <Link to="/">Go back to the recipes</Link>
      </div>
    </Navigation>
  );
};

export default NotFound;
