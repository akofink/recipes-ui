import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown'
import { useParams } from 'react-router-dom';

export const BASE_URL = 'https://raw.githubusercontent.com/akofink/recipes-md/main'

export const Recipe = () => {
  const { filename } = useParams();
  const url = `${BASE_URL}/${filename}.md`;
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    fetch(url)
      .then((response) => response.text())
      .then((text) => setMarkdown(text));
  }, [url]);

  return (
      <ReactMarkdown>
          { markdown }
      </ReactMarkdown>
  )
}
