import { FC } from "react";
import { Nav, Navbar } from "react-bootstrap";
import { Link } from "react-router-dom";

export const ADD_RECIPE_URL = 'https://github.com/akofink/recipes-md/new/main/recipes'

export const Navigation: FC = ({ children }) => {
    return (<>
        <Navbar>
            <Link to='/' className='logo-link'>
                <Navbar.Brand>akRecipes</Navbar.Brand>
            </Link>
            <Navbar.Collapse className='justify-content-end'>
                <Nav.Link href={ADD_RECIPE_URL} target='_blank'>
                    Add a recipe
                </Nav.Link>
            </Navbar.Collapse>
        </Navbar>
        <div className="app-container-div">
            { children }
        </div>
    </>);
};

export default Navigation;