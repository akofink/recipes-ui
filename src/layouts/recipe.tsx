import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown'
import { useParams } from 'react-router-dom';
import Navigation from './navigation';
// Note: generated at build-time. During development, run `yarn generate` first.
import recipesData from '../generated/recipes.json';

export const EDIT_BASE_URL = 'https://github.com/akofink/recipes-md/edit/main/recipes'

export const Recipe = () => {
  const { fileBasename } = useParams();
  const name = fileBasename?.replace(/\/$/, '')
  const filename = `${name}.md`
  const markdown = useMemo(() => (
    (recipesData as any[])?.find(r => r.filename === filename)?.markdown || ''
  ), [filename])

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
