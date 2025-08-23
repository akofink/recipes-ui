import { FC } from "react";
import { Nav, Navbar } from "react-bootstrap";
import { Link } from "react-router-dom";

const NEW_RECIPE_TEMPLATE = `Yield: 4 servings

Prep time: 10 minutes

Cook time: 20 minutes

Total time: 30 minutes


### Ingredients
- 12 oz dried pasta
- 2 tbsp olive oil
- 2 cloves garlic, minced
- 1 (14 oz) can crushed tomatoes
- 1/2 tsp salt, or to taste
- 1/4 tsp black pepper
- 1/4 tsp red pepper flakes (optional)
- Fresh basil or parsley, chopped (optional)
- Grated Parmesan, for serving (optional)


### Instructions
1. Bring a large pot of salted water to a boil. Cook pasta until al dente; reserve 1/2 cup pasta water, then drain.
2. Meanwhile, warm olive oil in a skillet over medium heat. Add garlic; cook 30–60 seconds until fragrant.
3. Stir in crushed tomatoes, salt, pepper, and red pepper flakes. Simmer 5–10 minutes.
4. Add drained pasta to the sauce, tossing to coat. Use a splash of reserved pasta water to loosen if needed.
5. Serve topped with herbs and Parmesan.`;

export const ADD_RECIPE_URL = `https://github.com/akofink/recipes-md/new/main/recipes?filename=new_recipe.md&value=${encodeURIComponent(NEW_RECIPE_TEMPLATE)}`;

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
