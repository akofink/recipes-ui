import React, { FC, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    Card, Col, Row
} from 'react-bootstrap';
import { RECIPESMD_RAW } from '../constants';
import { GithubFile } from '../types';
import recipesData from '../generated/recipes.json';

export const RecipeCard: FC<GithubFile> = ({ name }) => {
    const imageName = (recipesData as any[])?.find(r => r.name === name)?.imageName || null;
    const imageSrc = useMemo(
        () => (
            imageName ? `${RECIPESMD_RAW}/images/${name}/${imageName}` : './empty.svg'
        ),
        [imageName, name]
    )

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