import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown'
import { useParams } from 'react-router-dom';
import Navigation from './navigation';
import { RECIPESMD_RAW } from '../constants';
// Note: generated at build-time. During development, run `yarn generate` first.
import recipesData from '../generated/recipes.json';

export const EDIT_BASE_URL = 'https://github.com/akofink/recipes-md/edit/main/recipes'

export const Recipe = () => {
  const { fileBasename } = useParams();
  const name = fileBasename?.replace(/\/$/, '')
  const filename = `${name}.md`
  const recipe = useMemo(() => (
    (recipesData as any[])?.find(r => r.filename === filename) || null
  ), [filename])
  const markdown = recipe?.markdown || ''
  const imageNames: string[] = (recipe?.imageNames || []) as string[]

  return (
    <Navigation>
      <h1>{ name }</h1>
      {imageNames.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          {imageNames.map((img) => (
            <img
              key={img}
              src={`${RECIPESMD_RAW}/images/${name}/${img}`}
              alt={`${name} ${img}`}
              style={{ maxWidth: '100%', height: 'auto', display: 'block', marginBottom: '0.5rem' }}
            />
          ))}
        </div>
      )}
      <ReactMarkdown>
        {markdown}
      </ReactMarkdown>
      <a href={`${EDIT_BASE_URL}/${filename}`} target='_blank'>Edit</a>
    </Navigation>
  )
}
