import { FC, ReactElement, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Container, Row, Form } from "react-bootstrap";
import RecipeCard from "../components/recipe-card";

// Note: generated at build-time. During development, run `yarn generate` first.
import recipesData from "../generated/recipes.json";
import { GithubFile, RecipeData } from "../types";
import Navigation from "./navigation";

export const Recipes: FC = () => {
  const [recipes, setRecipes] = useState<RecipeData[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    // Static data loaded from generated JSON at build time
    setRecipes(recipesData as unknown as RecipeData[]);
  }, []);

  // Keep local state in sync with URL (back/forward navigation)
  useEffect(() => {
    const qParam = searchParams.get("q") || "";
    if (qParam !== query) {
      setQuery(qParam);
    }
  }, [searchParams]);

  const fileToCard: (props: GithubFile) => ReactElement = (props) => (
    <RecipeCard key={props.name} {...props} />
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.name.toLowerCase().includes(q));
  }, [recipes, query]);

  const makeCards: (recipes: GithubFile[]) => ReactElement[] = (recipes) =>
    recipes.map(({ name }) => fileToCard({ name }));
  const cards: ReactElement[] = useMemo(
    () => makeCards(filtered as unknown as GithubFile[]),
    [filtered],
  );

  return (
    <Navigation>
      <Container>
        <Form className="mb-3">
          <Form.Control
            type="search"
            placeholder="Search recipes..."
            value={query}
            onChange={(e) => {
              const v = e.currentTarget.value;
              setQuery(v);
              const next = new URLSearchParams(searchParams);
              if (v.trim()) {
                next.set("q", v);
              } else {
                next.delete("q");
              }
              setSearchParams(next, { replace: true });
            }}
          />
        </Form>
        <Row xs={2} sm={3} md={4} lg={5}>
          {cards}
        </Row>
      </Container>
    </Navigation>
  );
};
