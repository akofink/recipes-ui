import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Container,
  Row,
  Col,
} from 'react-bootstrap';

type File = {
  name: string;
}

export const Recipes: FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  useEffect(() => {
    fetch('https://api.github.com/repos/akofink/recipes-md/contents')
      .then(response => response.json())
      .then(files => setFiles(files));
  }, []);

  const fileToRow = (file: File) => (
    <Row>
      { file.name }
    </Row>
  );
  const makeRows = (json: any) => json.map(fileToRow);
  const rows: FC[] = useMemo(makeRows(files), [files]);

  return (
    <Container>
      { ...rows }
    </Container>
  );
};
