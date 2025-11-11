
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Recipe, DietaryRestriction } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error("Failed to read file as base64 string"));
      }
      const base64EncodedData = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64EncodedData,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const analyzeFridgeContents = async (imageFile: File): Promise<string[]> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const prompt = "Analyze this image of a fridge's contents. Identify all edible food items and ingredients. Return a comma-separated list of the items you find. Be concise and focus only on the ingredients. For example: 'eggs, milk, cheddar cheese, lettuce, tomatoes, chicken breast'.";
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: [imagePart as any, { text: prompt }] },
        });

        const ingredientsText = response.text;
        if (!ingredientsText) return [];
        
        return ingredientsText.split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
    } catch (error) {
        console.error("Error analyzing fridge contents:", error);
        throw new Error("Failed to analyze image with Gemini API.");
    }
};

export const getRecipes = async (ingredients: string[], filters: DietaryRestriction[]): Promise<Recipe[]> => {
    const filtersText = filters.length > 0 ? ` The user has the following dietary restrictions: ${filters.join(', ')}.` : '';
    const prompt = `Based on the following ingredients: ${ingredients.join(', ')}, suggest 5 diverse recipes.${filtersText} For each recipe, provide a name, difficulty (Easy, Medium, or Hard), estimated prep time, approximate calorie count, a list of all required ingredients with quantities, and step-by-step instructions. Some of the provided ingredients might not be enough for a full recipe, so feel free to include other common ingredients as 'missing'.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recipes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING, description: "The name of the recipe." },
                                    difficulty: { type: Type.STRING, description: "Difficulty level: Easy, Medium, or Hard." },
                                    prepTime: { type: Type.STRING, description: "Estimated preparation and cooking time, e.g., '30 minutes'." },
                                    calories: { type: Type.INTEGER, description: "Approximate calorie count per serving." },
                                    ingredients: {
                                        type: Type.ARRAY,
                                        description: "A list of all ingredients required for the recipe.",
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                name: { type: Type.STRING, description: "Name of the ingredient." },
                                                quantity: { type: Type.STRING, description: "Quantity of the ingredient, e.g., '2 cups' or '1 large'." }
                                            },
                                            required: ['name', 'quantity']
                                        }
                                    },
                                    instructions: {
                                        type: Type.ARRAY,
                                        description: "Step-by-step cooking instructions.",
                                        items: {
                                            type: Type.STRING
                                        }
                                    }
                                },
                                required: ['name', 'difficulty', 'prepTime', 'calories', 'ingredients', 'instructions']
                            }
                        }
                    },
                    required: ['recipes']
                },
            },
        });
        
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return result.recipes as Recipe[];

    } catch (error) {
        console.error("Error generating recipes:", error);
        throw new Error("Failed to generate recipes with Gemini API.");
    }
};

export const generateRecipeImage = async (recipeName: string): Promise<string> => {
    try {
        const prompt = `A delicious and professional photo of "${recipeName}", beautifully plated on a clean, modern dish. The lighting should be bright and natural, highlighting the textures of the food.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [{ text: prompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        throw new Error("No image data found in Gemini response.");

    } catch (error) {
        console.error(`Error generating image for recipe "${recipeName}":`, error);
        throw new Error(`Failed to generate an image for the recipe: ${recipeName}.`);
    }
};
