import { useState, useEffect } from "react";
// Markdown pre-rendered in build step; use 'html' for rendering
import { useParams, useSearchParams } from "react-router-dom";
import Navigation from "./navigation";
import { Row, Col, Modal, Spinner, Alert } from "react-bootstrap";
import { RECIPESMD_RAW } from "../constants";
import { findRecipe } from "../services/recipes";
import { RecipeData } from "../types";

export const EDIT_BASE_URL =
  "https://github.com/akofink/recipes-md/edit/main/recipes";

type RecipeProps = {
  initialRecipe?: RecipeData | null;
};

export const Recipe = ({ initialRecipe }: RecipeProps) => {
  const { fileBasename } = useParams();
  const name = fileBasename?.replace(/\/$/, "");
  const filename = `${name}.md`;
  const [recipe, setRecipe] = useState<RecipeData | null>(
    initialRecipe ?? null,
  );
  const [loading, setLoading] = useState(!initialRecipe);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRecipe && initialRecipe.filename === filename) {
      setLoading(false);
      return;
    }
    const loadRecipe = async () => {
      try {
        setLoading(true);
        const data = await findRecipe(filename);
        setRecipe(data);
        setError(null);
      } catch (err) {
        setError("Failed to load recipe. Please try again later.");
        console.error("Error loading recipe:", err);
      } finally {
        setLoading(false);
      }
    };

    loadRecipe();
  }, [filename]);

  const html = recipe?.html || "";
  const imageNames: string[] = (recipe?.imageNames || []) as string[];
  const [searchParams, setSearchParams] = useSearchParams();
  const activeImage = searchParams.get("img");
  const handleOpen = (img: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("img", img);
    setSearchParams(next, { replace: false });
  };
  const handleClose = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("img");
    setSearchParams(next, { replace: false });
  };

  if (loading) {
    return (
      <Navigation>
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading recipe...</span>
          </Spinner>
          <div className="mt-2">Loading {name}...</div>
        </div>
      </Navigation>
    );
  }

  if (error || !recipe) {
    return (
      <Navigation>
        <Alert variant="danger" className="my-3">
          <Alert.Heading>Recipe not found</Alert.Heading>
          <p>{error || `Recipe "${name}" could not be found.`}</p>
        </Alert>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <h1>{name}</h1>
      {imageNames.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <Row xs={1} sm={2} md={3} lg={4} className="g-3">
            {imageNames.map((img) => (
              <Col key={img}>
                <img
                  src={`${RECIPESMD_RAW}/images/${name}/${img}`}
                  alt={`${name} ${img}`}
                  style={{
                    width: "100%",
                    height: 200,
                    objectFit: "cover",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                  onClick={() => handleOpen(img)}
                />
              </Col>
            ))}
          </Row>
        </div>
      )}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <a href={`${EDIT_BASE_URL}/${filename}`} target="_blank" rel="noreferrer">
        Edit
      </a>

      <Modal show={!!activeImage} onHide={handleClose} centered size="lg">
        <Modal.Body style={{ padding: 0, background: "#000" }}>
          {activeImage && (
            <img
              src={`${RECIPESMD_RAW}/images/${name}/${activeImage}`}
              alt={`${name} ${activeImage}`}
              style={{ width: "100%", height: "auto", display: "block" }}
              onClick={handleClose}
            />
          )}
        </Modal.Body>
      </Modal>
    </Navigation>
  );
};
