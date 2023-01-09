import { FC, ReactElement, useEffect, useMemo, useState } from 'react';
import {
  Container, Row
} from 'react-bootstrap';
import RecipeCard from '../components/recipe-card';

import { RECIPESMD_CONTENTS } from '../constants';
import { GithubFile } from '../types';
import { fetchWithGithubAuthToJson, jsonToFiles } from '../util/fetch';
import Navigation from './navigation';

export const Recipes: FC = () => {
  const [recipes, setRecipes] = useState<GithubFile[]>([]);

  useEffect(() => {
    fetchWithGithubAuthToJson(`${RECIPESMD_CONTENTS}/recipes`)
      .then(json => setRecipes(jsonToFiles(json)));
  }, []);

  const fileToCard: (props: GithubFile) => ReactElement = (props) => (
    <RecipeCard key={props.name} {...props} />
  );
  const makeCards: (recipes: GithubFile[]) => ReactElement[] = recipes => recipes.map(fileToCard);
  const cards: ReactElement[] = useMemo(() => makeCards(recipes), [recipes]);

  return (
    <Navigation>
      <Container>
        <Row xs={2} sm={3} md={4} lg={5}>{cards}</Row>
      </Container>
    </Navigation>
  );
};
