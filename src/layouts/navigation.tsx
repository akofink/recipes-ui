import { FC } from "react";
import { Navbar } from "react-bootstrap";
import { Link } from "react-router-dom";

export const Navigation: FC = ({ children }) => {
    return (<>
        <Navbar>
            <Link to='/' className='logo-link'>
                <Navbar.Brand>akRecipes</Navbar.Brand>
            </Link>
        </Navbar>
        { children }
    </>);
};

export default Navigation;