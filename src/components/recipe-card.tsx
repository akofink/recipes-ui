import React, { FC, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Card, Col, Row
} from 'react-bootstrap';
import { RECIPESMD_CONTENTS, RECIPESMD_RAW } from '../constants';
import { GithubFile } from '../types';
import { fetchWithGithubAuthToJson, jsonToFiles } from '../util/fetch';

export const RecipeCard: FC<GithubFile> = ({ name }) => {
    const [images, setImages] = useState<GithubFile[] | undefined>();
    const imageSrc = useMemo(
        () => (
            images === undefined && './spinner.svg' ||
            images && (
                (!images.length && './empty.svg') ||
                `${RECIPESMD_RAW}/images/${name}/${images[0].name}`
            )
        ),
        [images]
    )

    useEffect(() => {
        if (name) {
            fetchWithGithubAuthToJson(`${RECIPESMD_CONTENTS}/images/${name}`)
                .then(json => setImages(jsonToFiles(json)))
                .catch(response => { if(response.status === 404) { setImages([]); } })
        }
    }, [name])

    return (<Col><Card className='recipe-card'>
        <Link to={`/${name}`} className='clean-link overflow-hidden'>
            <Card.Img
                className={`recipe-card-img ${images === undefined ? 'spin' : ''}`}
                src={imageSrc}
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