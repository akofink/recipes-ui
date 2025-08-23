import { FC, ReactElement, useEffect, useMemo, useState } from 'react';
import {
  Container, Row, Form
} from 'react-bootstrap';
import RecipeCard from '../components/recipe-card';

// Note: generated at build-time. During development, run `yarn generate` first.
import recipesData from '../generated/recipes.json';
import { GithubFile, RecipeData } from '../types';
import Navigation from './navigation';

export const Recipes: FC = () => {
  const [recipes, setRecipes] = useState<RecipeData[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    // Static data loaded from generated JSON at build time
    setRecipes(recipesData as unknown as RecipeData[]);
  }, []);

  const fileToCard: (props: GithubFile) => ReactElement = (props) => (
    <RecipeCard key={props.name} {...props} />
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(r => r.name.toLowerCase().includes(q));
  }, [recipes, query]);

  const makeCards: (recipes: GithubFile[]) => ReactElement[] = recipes => recipes.map(({ name }) => fileToCard({ name }));
  const cards: ReactElement[] = useMemo(() => makeCards(filtered as unknown as GithubFile[]), [filtered]);

  return (
    <Navigation>
      <Container>
        <Form className="mb-3">
          <Form.Control
            type="search"
            placeholder="Search recipes..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
        </Form>
        <Row xs={2} sm={3} md={4} lg={5}>{cards}</Row>
      </Container>
    </Navigation>
  );
};
