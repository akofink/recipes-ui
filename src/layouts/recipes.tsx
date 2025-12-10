import { FC, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Container, Row, Form, Spinner, Alert } from "react-bootstrap";
import RecipeCard from "../components/recipe-card";
import { fetchRecipes } from "../services/recipes";
import { RecipeData } from "../types";
import Navigation from "./navigation";

export const Recipes: FC = () => {
  const [recipes, setRecipes] = useState<RecipeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  // Load recipes on mount
  useEffect(() => {
    const loadRecipes = async () => {
      try {
        setLoading(true);
        const data = await fetchRecipes();
        setRecipes(data);
        setError(null);
      } catch (err) {
        setError("Failed to load recipes. Please try again later.");
        console.error("Error loading recipes:", err);
      } finally {
        setLoading(false);
      }
    };

    loadRecipes();
  }, []);

  // Keep local state in sync with URL (back/forward navigation)
  useEffect(() => {
    const qParam = searchParams.get("q") || "";
    if (qParam !== query) {
      setQuery(qParam);
    }
  }, [searchParams, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.name.toLowerCase().includes(q));
  }, [recipes, query]);

  const cards = useMemo(
    () => filtered.map((r) => <RecipeCard key={r.name} name={r.name} />),
    [filtered],
  );

  if (loading) {
    return (
      <Navigation>
        <Container className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading recipes...</span>
          </Spinner>
          <div className="mt-2">Loading recipes...</div>
        </Container>
      </Navigation>
    );
  }

  if (error) {
    return (
      <Navigation>
        <Container>
          <Alert variant="danger" className="my-3">
            <Alert.Heading>Oops! Something went wrong</Alert.Heading>
            <p>{error}</p>
          </Alert>
        </Container>
      </Navigation>
    );
  }

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
