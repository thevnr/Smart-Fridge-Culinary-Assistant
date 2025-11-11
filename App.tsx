
import React, { useState, useCallback, useMemo } from 'react';
import { analyzeFridgeContents, getRecipes, generateRecipeImage } from './services/geminiService';
import { Recipe, DietaryRestriction } from './types';
import RecipeModal from './components/RecipeModal';
import { ClockIcon, FireIcon, ChefHatIcon, FridgeIcon } from './components/icons';

type AppState = 'initial' | 'analyzing' | 'generating' | 'results';

const dietaryOptions = Object.values(DietaryRestriction);

const ImageUploader: React.FC<{ onImageUpload: (file: File) => void; isAnalyzing: boolean }> = ({ onImageUpload, isAnalyzing }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onImageUpload(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-lg border border-gray-200 text-center">
      <FridgeIcon className="mx-auto h-16 w-16 text-blue-500 mb-4" />
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Unlock Your Fridge's Potential</h2>
      <p className="text-gray-600 mb-6">Snap a photo of your fridge, and let AI be your sous-chef!</p>
      <label htmlFor="file-upload" className="cursor-pointer inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md">
        {isAnalyzing ? "Analyzing..." : "Upload Fridge Photo"}
      </label>
      <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isAnalyzing} />
      {imagePreview && (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-2">{fileName}</p>
          <img src={imagePreview} alt="Fridge preview" className="mx-auto max-h-64 rounded-lg shadow-md" />
        </div>
      )}
    </div>
  );
};

const RecipeCard: React.FC<{ recipe: Recipe; onSelect: () => void }> = ({ recipe, onSelect }) => (
    <div onClick={onSelect} className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
        <div className="relative h-48 bg-gray-200">
          <img className="w-full h-full object-cover" src={recipe.imageUrl || `https://picsum.photos/seed/${recipe.name}/400/300`} alt={recipe.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
           <h3 className="absolute bottom-0 left-0 p-4 text-xl font-bold text-white">{recipe.name}</h3>
        </div>
        <div className="p-4">
            <div className="flex justify-between items-center text-sm text-gray-600">
                <span className="flex items-center gap-1.5"><ChefHatIcon className="w-4 h-4 text-gray-400" /> {recipe.difficulty}</span>
                <span className="flex items-center gap-1.5"><ClockIcon className="w-4 h-4 text-gray-400" /> {recipe.prepTime}</span>
                <span className="flex items-center gap-1.5"><FireIcon className="w-4 h-4 text-gray-400" /> {recipe.calories} kcal</span>
            </div>
        </div>
    </div>
);

const Sidebar: React.FC<{ onFilterChange: (filters: DietaryRestriction[]) => void; activeFilters: DietaryRestriction[] }> = ({ onFilterChange, activeFilters }) => {
  const handleToggle = (filter: DietaryRestriction) => {
    const newFilters = activeFilters.includes(filter)
      ? activeFilters.filter(f => f !== filter)
      : [...activeFilters, filter];
    onFilterChange(newFilters);
  };

  return (
    <aside className="w-full md:w-64 lg:w-72 p-6 bg-white rounded-2xl shadow-lg border border-gray-200 self-start">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Dietary Options</h3>
      <div className="space-y-3">
        {dietaryOptions.map(option => (
          <label key={option} className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={activeFilters.includes(option)}
              onChange={() => handleToggle(option)}
            />
            <span className="ml-3 text-gray-700 font-medium">{option.replace('-', ' ')}</span>
          </label>
        ))}
      </div>
    </aside>
  );
};

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('initial');
    const [error, setError] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [identifiedIngredients, setIdentifiedIngredients] = useState<string[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [activeFilters, setActiveFilters] = useState<DietaryRestriction[]>([]);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    
    const handleImageUpload = async (file: File) => {
      setImageFile(file);
      setAppState('analyzing');
      setError(null);
      try {
        const ingredients = await analyzeFridgeContents(file);
        setIdentifiedIngredients(ingredients);
        setAppState('generating');
        const generatedRecipes = await getRecipes(ingredients, activeFilters);
        
        const recipesWithImages = await Promise.all(
            generatedRecipes.map(async (recipe) => {
              try {
                const imageUrl = await generateRecipeImage(recipe.name);
                return { ...recipe, imageUrl };
              } catch (imageError) {
                console.error(`Could not generate image for ${recipe.name}:`, imageError);
                return recipe; // Return recipe without image on failure
              }
            })
        );
        
        setRecipes(recipesWithImages);
        setAppState('results');
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
        setAppState('initial');
      }
    };
    
    const handleFilterChange = useCallback(async (newFilters: DietaryRestriction[]) => {
        setActiveFilters(newFilters);
        if(identifiedIngredients.length > 0) {
            setAppState('generating');
            setError(null);
            try {
                const generatedRecipes = await getRecipes(identifiedIngredients, newFilters);

                const recipesWithImages = await Promise.all(
                    generatedRecipes.map(async (recipe) => {
                      try {
                        const imageUrl = await generateRecipeImage(recipe.name);
                        return { ...recipe, imageUrl };
                      } catch (imageError) {
                        console.error(`Could not generate image for ${recipe.name}:`, imageError);
                        return recipe;
                      }
                    })
                );

                setRecipes(recipesWithImages);
                setAppState('results');
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred.");
                setAppState('results');
            }
        }
    }, [identifiedIngredients]);

    const filteredRecipes = useMemo(() => {
        return recipes; // The API is called on filter change, so we don't need client-side filtering.
    }, [recipes]);
    
    const renderContent = () => {
      if(appState === 'initial' || appState === 'analyzing') {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
              <ImageUploader onImageUpload={handleImageUpload} isAnalyzing={appState === 'analyzing'} />
              {error && <p className="mt-4 text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
            <header className="mb-8 text-center">
              <h1 className="text-4xl font-extrabold text-gray-800">Your Culinary Companion</h1>
              <p className="text-lg text-gray-600 mt-2">Discover delicious recipes based on what you have!</p>
            </header>
            <div className="flex flex-col md:flex-row gap-8">
              <Sidebar activeFilters={activeFilters} onFilterChange={handleFilterChange} />
              <main className="flex-1">
                  {error && appState === 'results' && <p className="mb-4 text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
                  
                  {appState === 'generating' && (
                      <div className="flex flex-col items-center justify-center h-96">
                          <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
                          <p className="mt-4 text-lg text-gray-600">Finding recipes & creating delicious photos...</p>
                      </div>
                  )}

                  {appState === 'results' && (
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                           {filteredRecipes.map((recipe, index) => <RecipeCard key={index} recipe={recipe} onSelect={() => setSelectedRecipe(recipe)} />)}
                       </div>
                  )}
              </main>
            </div>
        </div>
      );
    };

    return (
        <>
            {renderContent()}
            <RecipeModal 
                recipe={selectedRecipe}
                onClose={() => setSelectedRecipe(null)}
                ownedIngredients={identifiedIngredients}
            />
        </>
    );
};

export default App;