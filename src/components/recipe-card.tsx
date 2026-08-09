import { FC, useMemo, useState, useEffect } from "react";
import { Link } from "react-router";
import { Card, Col } from "react-bootstrap";
import { RECIPESMD_RAW } from "../constants";
import { GithubFile, RecipeData } from "../types";
import { findRecipeByName } from "../services/recipes";

type RecipeCardProps = GithubFile & {
  recipe?: RecipeData | null;
};

export const RecipeCard: FC<RecipeCardProps> = ({ name, recipe }) => {
  const [loadedRecipe, setLoadedRecipe] = useState<RecipeData | null>(null);

  // When the parent passes `recipe`, use it directly instead of mirroring it
  // into state (a synchronous setState inside the effect, which the linter
  // flags and which only causes an extra render). Only fetch by name when the
  // parent does not provide the data.
  useEffect(() => {
    if (recipe) return;
    let cancelled = false;
    const loadRecipe = async () => {
      if (!name) return;
      try {
        const data = await findRecipeByName(name);
        if (!cancelled) setLoadedRecipe(data);
      } catch (err) {
        if (!cancelled) console.error("Error loading recipe for card:", err);
      }
    };

    loadRecipe();
    return () => {
      cancelled = true;
    };
  }, [name, recipe]);

  const imageName = (recipe ?? loadedRecipe)?.imageName ?? null;
  const imageSrc = useMemo(
    () =>
      imageName ? `${RECIPESMD_RAW}/images/${name}/${imageName}` : "/empty.svg",
    [imageName, name],
  );

  return (
    <Col>
      <Card className="recipe-card">
        <Link to={`/${name}`} className="clean-link overflow-hidden">
          <Card.Img
            className={"recipe-card-img"}
            src={imageSrc}
            variant="top"
          />
          <Card.Body className="recipe-card-body">
            <Card.Title className="recipe-card-title" as="h6" title={name}>
              {name}
            </Card.Title>
          </Card.Body>
        </Link>
      </Card>
    </Col>
  );
};

export default RecipeCard;
