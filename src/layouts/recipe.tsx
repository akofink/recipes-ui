import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown'
import { useParams } from 'react-router-dom';
import Navigation from './navigation';
import { Row, Col, Modal } from 'react-bootstrap';
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
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const handleOpen = (img: string) => setActiveImage(img);
  const handleClose = () => setActiveImage(null);

  return (
    <Navigation>
      <h1>{ name }</h1>
      {imageNames.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <Row xs={1} sm={2} md={3} lg={4} className="g-3">
            {imageNames.map((img) => (
              <Col key={img}>
                <img
                  src={`${RECIPESMD_RAW}/images/${name}/${img}`}
                  alt={`${name} ${img}`}
                  style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }}
                  onClick={() => handleOpen(img)}
                />
              </Col>
            ))}
          </Row>
        </div>
      )}
      <ReactMarkdown>
        {markdown}
      </ReactMarkdown>
      <a href={`${EDIT_BASE_URL}/${filename}`} target='_blank'>Edit</a>

      <Modal show={!!activeImage} onHide={handleClose} centered size="lg">
        <Modal.Body style={{ padding: 0, background: '#000' }}>
          {activeImage && (
            <img
              src={`${RECIPESMD_RAW}/images/${name}/${activeImage}`}
              alt={`${name} ${activeImage}`}
              style={{ width: '100%', height: 'auto', display: 'block' }}
              onClick={handleClose}
            />
          )}
        </Modal.Body>
      </Modal>
    </Navigation>
  )
}
