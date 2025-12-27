import { FC, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Container, Form, Row, Spinner } from "react-bootstrap";
import RecipeCard from "../components/recipe-card";
import { fetchRecipes } from "../services/recipes";
import { RecipeData } from "../types";
import Navigation from "./navigation";
import { DEFAULT_PAGE_SIZE } from "../constants";

type RecipesProps = {
  initialRecipes?: RecipeData[];
  initialPageSize?: number;
};

const parsePositiveInt = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const Recipes: FC<RecipesProps> = ({
  initialRecipes,
  initialPageSize,
}) => {
  const [recipes, setRecipes] = useState<RecipeData[]>(initialRecipes ?? []);
  const [loading, setLoading] = useState(!initialRecipes);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Load recipes on mount
  useEffect(() => {
    if (initialRecipes) {
      setLoading(false);
      return;
    }
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
  }, [initialRecipes]);

  const query = searchParams.get("q") || "";
  const defaultPageSize = initialPageSize ?? DEFAULT_PAGE_SIZE;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.name.toLowerCase().includes(q));
  }, [recipes, query]);

  const totalPages = useMemo(() => {
    const rawSize = parsePositiveInt(searchParams.get("size"));
    const pageSize = rawSize ?? defaultPageSize;
    return Math.max(1, Math.ceil(filtered.length / pageSize));
  }, [filtered.length, searchParams, defaultPageSize]);

  const pageSize = useMemo(() => {
    const rawSize = parsePositiveInt(searchParams.get("size"));
    return rawSize ?? defaultPageSize;
  }, [searchParams, defaultPageSize]);

  const page = useMemo(() => {
    const rawPage = parsePositiveInt(searchParams.get("page"));
    const safePage = rawPage ?? 1;
    return clamp(safePage, 1, totalPages);
  }, [searchParams, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const cards = useMemo(
    () =>
      paged.map((r) => <RecipeCard key={r.name} name={r.name} recipe={r} />),
    [paged],
  );

  const updateParams = (updates: {
    q?: string;
    page?: number;
    size?: number;
  }) => {
    const next = new URLSearchParams(searchParams);
    if (updates.q !== undefined) {
      if (updates.q.trim()) {
        next.set("q", updates.q);
      } else {
        next.delete("q");
      }
    }
    if (updates.size !== undefined) {
      if (updates.size !== defaultPageSize) {
        next.set("size", String(updates.size));
      } else {
        next.delete("size");
      }
    }
    if (updates.page !== undefined) {
      if (updates.page !== 1) {
        next.set("page", String(updates.page));
      } else {
        next.delete("page");
      }
    }
    setSearchParams(next);
  };

  const pageSizes = [10, 20, 50];

  const pages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const numbers = new Set<number>([1, totalPages, page]);
    if (page - 1 > 1) numbers.add(page - 1);
    if (page + 1 < totalPages) numbers.add(page + 1);
    return Array.from(numbers).sort((a, b) => a - b);
  }, [page, totalPages]);

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
          <Row className="g-2 align-items-end">
            <Form.Group className="col-12 col-md-8">
              <Form.Control
                type="search"
                placeholder="Search recipes..."
                value={query}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  updateParams({ q: v, page: 1 });
                }}
              />
            </Form.Group>
            <Form.Group className="col-12 col-md-4 text-md-end">
              <div className="d-inline-flex gap-2 flex-wrap align-items-center">
                {pageSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`btn btn-link btn-sm p-0 text-decoration-none ${
                      pageSize === size ? "text-body fw-semibold" : "text-muted"
                    }`}
                    onClick={() => updateParams({ size, page: 1 })}
                  >
                    {size}
                  </button>
                ))}
                <span className="small text-muted">per page</span>
              </div>
            </Form.Group>
          </Row>
        </Form>
        <Row xs={2} sm={3} md={4} lg={5}>
          {cards}
        </Row>
        {totalPages > 1 && (
          <div className="d-flex flex-wrap justify-content-center gap-2 mt-3 small">
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-decoration-none text-muted"
              onClick={() => updateParams({ page: 1 })}
              disabled={page === 1}
            >
              First
            </button>
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-decoration-none text-muted"
              onClick={() => updateParams({ page: page - 1 })}
              disabled={page === 1}
            >
              Prev
            </button>
            {pages.map((pageNumber, idx) => {
              const prev = pages[idx - 1];
              const needsEllipsis = prev && pageNumber - prev > 1;
              return (
                <span
                  key={`page-${pageNumber}`}
                  className="d-inline-flex gap-2"
                >
                  {needsEllipsis && <span className="text-muted">…</span>}
                  <button
                    type="button"
                    className={`btn btn-link btn-sm p-0 text-decoration-none ${
                      pageNumber === page
                        ? "text-body fw-semibold"
                        : "text-muted"
                    }`}
                    onClick={() => updateParams({ page: pageNumber })}
                  >
                    {pageNumber}
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-decoration-none text-muted"
              onClick={() => updateParams({ page: page + 1 })}
              disabled={page === totalPages}
            >
              Next
            </button>
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-decoration-none text-muted"
              onClick={() => updateParams({ page: totalPages })}
              disabled={page === totalPages}
            >
              Last
            </button>
          </div>
        )}
      </Container>
    </Navigation>
  );
};
