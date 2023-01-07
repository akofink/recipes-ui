import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown'
import { Link, useParams } from 'react-router-dom';
import Navigation from './navigation';

export const BASE_URL = 'https://raw.githubusercontent.com/akofink/recipes-md/main/recipes'
export const EDIT_BASE_URL = 'https://github.com/akofink/recipes-md/edit/main/recipes'

export const Recipe = () => {
  const { fileBasename } = useParams();
  const name = fileBasename?.replace(/\/$/, '')
  const filename = `${name}.md`
  const url = `${BASE_URL}/${filename}`;
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    fetch(url)
      .then((response) => response.text())
      .then((text) => setMarkdown(text));
  }, [url]);

  return (
    <Navigation>
      <h1>{ name }</h1>
      <ReactMarkdown>
        {markdown}
      </ReactMarkdown>
      <a href={`${EDIT_BASE_URL}/${filename}`} target='_blank'>Edit</a>
    </Navigation>
  )
}
