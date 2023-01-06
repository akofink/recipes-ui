import { FC, ReactElement, useEffect, useMemo, useState } from 'react';
import {
  Container,
  Row,
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Navigation from './navigation';

type FileJson = {
  name?: string;
}
type File = {
  name: string;
}

export const Recipes: FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  useEffect(() => {
    fetch('https://api.github.com/repos/akofink/recipes-md/contents/recipes')
      .then(response => response.json())
      .then(json => setFiles(jsonToFiles(json)));
  }, []);

  const jsonToFiles = (files: FileJson[]) => files.map(
    json => ({ name: (json.name ?? '').replace(/.md$/, '') })
  )
  const fileToRow: (props: File) => ReactElement = ({ name }) => (
    <Row key={ name }>
      <Link to={ `/${name}` }>
        { name }
      </Link>
    </Row>
  );
  const makeRows: (files: File[]) => ReactElement[] = files => files.map(fileToRow);
  const rows: ReactElement[] = useMemo(() => makeRows(files), [files]);

  return (
    <Navigation>
      <Container>
        { rows }
      </Container>
    </Navigation>
  );
};
