import { FC, ReactElement, useEffect, useMemo, useState } from 'react';
import {
  Container, Row
} from 'react-bootstrap';
import RecipeCard from '../components/recipe-card';

import recipesData from '../generated/recipes.json';
import { GithubFile, RecipeData } from '../types';
import Navigation from './navigation';

export const Recipes: FC = () => {
  const [recipes, setRecipes] = useState<RecipeData[]>([]);

  useEffect(() => {
    // Static data loaded from generated JSON at build time
    setRecipes(recipesData as unknown as RecipeData[]);
  }, []);

  const fileToCard: (props: GithubFile) => ReactElement = (props) => (
    <RecipeCard key={props.name} {...props} />
  );
  const makeCards: (recipes: GithubFile[]) => ReactElement[] = recipes => recipes.map(({ name }) => fileToCard({ name }));
  const cards: ReactElement[] = useMemo(() => makeCards(recipes as unknown as GithubFile[]), [recipes]);

  return (
    <Navigation>
      <Container>
        <Row xs={2} sm={3} md={4} lg={5}>{cards}</Row>
      </Container>
    </Navigation>
  );
};
