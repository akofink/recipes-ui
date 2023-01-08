import React, { FC, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Card, Col, Row
} from 'react-bootstrap';
import { RECIPESMD_CONTENTS, RECIPESMD_RAW } from '../constants';
import { GithubFile } from '../types';
import { fetchWithGithubAuthToJson, jsonToFiles } from '../util/fetch';

export const RecipeCard: FC<GithubFile> = ({ name, imageDir }) => {
    const [images, setImages] = useState<GithubFile[]>([]);

    useEffect(() => {
        if (imageDir) {
            fetchWithGithubAuthToJson(`${RECIPESMD_CONTENTS}/images/${imageDir}`)
                .then(json => setImages(jsonToFiles(json)))
        }
    }, [imageDir])

    return (<Col><Card className='recipe-card'>
        <Link to={`/${name}`} className='clean-link overflow-hidden'>
            <Card.Img
                className='recipe-card-img'
                src={images.length ? `${RECIPESMD_RAW}/images/${name}/${images[0].name}` : './loading.svg'}
                variant='top' />
            <Card.Body className='recipe-card-body'>
                <Card.Title className='recipe-card-title' as='h6'>
                        {name}
                </Card.Title>
            </Card.Body>
        </Link>
    </Card></Col>)
};

export default RecipeCard;