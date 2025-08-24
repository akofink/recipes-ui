import { FC, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, Col, OverlayTrigger, Tooltip } from "react-bootstrap";
import { RECIPESMD_RAW } from "../constants";
import { GithubFile, RecipeData } from "../types";
import recipesData from "../generated/recipes.json";

export const RecipeCard: FC<GithubFile> = ({ name }) => {
  const recipe = (recipesData as unknown as RecipeData[]).find(
    (r) => r.name === name,
  );
  const imageName = recipe?.imageName ?? null;
  const imageSrc = useMemo(
    () =>
      imageName
        ? `${RECIPESMD_RAW}/images/${name}/${imageName}`
        : "./empty.svg",
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
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id={`tt-${name}`}>{name}</Tooltip>}
            >
              <Card.Title className="recipe-card-title" as="h6">
                {name}
              </Card.Title>
            </OverlayTrigger>
          </Card.Body>
        </Link>
      </Card>
    </Col>
  );
};

export default RecipeCard;
