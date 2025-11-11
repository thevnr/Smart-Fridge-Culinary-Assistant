
export enum DietaryRestriction {
  Vegetarian = 'Vegetarian',
  Keto = 'Keto',
  GlutenFree = 'Gluten-Free',
  Vegan = 'Vegan',
  LowCarb = 'Low-Carb',
  HighProtein = 'High-Protein',
  Pescatarian = 'Pescatarian',
}

export interface RecipeIngredient {
  name: string;
  quantity: string;
}

export interface Recipe {
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prepTime: string;
  calories: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  imageUrl?: string;
}