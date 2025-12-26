import { FC, useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, Col } from "react-bootstrap";
import { RECIPESMD_RAW } from "../constants";
import { GithubFile, RecipeData } from "../types";
import { findRecipeByName } from "../services/recipes";

type RecipeCardProps = GithubFile & {
  recipe?: RecipeData | null;
};

export const RecipeCard: FC<RecipeCardProps> = ({ name, recipe }) => {
  const [loadedRecipe, setLoadedRecipe] = useState<RecipeData | null>(null);

  useEffect(() => {
    if (recipe) {
      setLoadedRecipe(recipe);
      return;
    }
    const loadRecipe = async () => {
      if (!name) return;
      try {
        const data = await findRecipeByName(name);
        setLoadedRecipe(data);
      } catch (err) {
        console.error("Error loading recipe for card:", err);
      }
    };

    loadRecipe();
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
