import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './App.scss';
import { Recipe } from './layouts/recipe';

export const BASE_URL = 'https://raw.githubusercontent.com/akofink/recipes-md/main'

const App = () => {
  const [markdown, setMarkdown] = useState("");
  const { filename } = useParams();
  const url = `${BASE_URL}/${filename}.md`;

  useEffect(() => {
    fetch(url)
      .then((response) => response.text())
      .then((text) => setMarkdown(text));
  }, [url]);

  return <Recipe markdown={markdown} />;
};

export default App;
