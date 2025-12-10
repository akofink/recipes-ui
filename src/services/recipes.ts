import { RecipeData } from "../types";

let recipesCache: RecipeData[] | null = null;

export const fetchRecipes = async (): Promise<RecipeData[]> => {
  if (recipesCache) {
    return recipesCache;
  }

  try {
    const response = await fetch("/static/recipes.json");
    if (!response.ok) {
      throw new Error(`Failed to fetch recipes: ${response.status}`);
    }
    const data = await response.json();
    recipesCache = data;
    return data;
  } catch (error) {
    console.error("Error fetching recipes:", error);
    throw error;
  }
};

export const findRecipe = async (
  filename: string,
): Promise<RecipeData | null> => {
  const recipes = await fetchRecipes();
  return recipes.find((r) => r.filename === filename) || null;
};

export const findRecipeByName = async (
  name: string,
): Promise<RecipeData | null> => {
  const recipes = await fetchRecipes();
  return recipes.find((r) => r.name === name) || null;
};
