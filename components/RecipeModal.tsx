
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Recipe, RecipeIngredient } from '../types';
import { ClockIcon, FireIcon, ChefHatIcon, PlayIcon, PauseIcon, StopIcon, XIcon } from './icons';

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  ownedIngredients: string[];
}

const RecipeModal: React.FC<RecipeModalProps> = ({ recipe, onClose, ownedIngredients }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeaking = useCallback(() => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  useEffect(() => {
    if (isSpeaking && recipe && currentStepIndex < recipe.instructions.length) {
      stopSpeaking();
      const textToSpeak = `Step ${currentStepIndex + 1}. ${recipe.instructions[currentStepIndex]}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.onend = () => {
        if (currentStepIndex < recipe.instructions.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        } else {
          setIsSpeaking(false);
        }
      };
      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    }
  }, [isSpeaking, currentStepIndex, recipe, stopSpeaking]);

  if (!recipe) return null;

  const handlePlayPause = () => {
    if (isSpeaking) {
      speechSynthesis.pause();
      setIsSpeaking(false);
    } else {
      if (speechSynthesis.paused) {
        speechSynthesis.resume();
      } else {
        if(currentStepIndex >= recipe.instructions.length) {
            setCurrentStepIndex(0);
        }
      }
      setIsSpeaking(true);
    }
  };

  const handleStop = () => {
    stopSpeaking();
    setCurrentStepIndex(0);
  };

  const getDifficultyColor = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    switch (difficulty) {
      case 'Easy': return 'text-green-500';
      case 'Medium': return 'text-yellow-500';
      case 'Hard': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-up">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">{recipe.name}</h2>
          <button onClick={() => { stopSpeaking(); onClose(); }} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XIcon />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="flex flex-wrap gap-6 mb-6 text-gray-600">
            <div className={`flex items-center gap-2 font-medium ${getDifficultyColor(recipe.difficulty)}`}>
              <ChefHatIcon className="w-5 h-5" />
              <span>{recipe.difficulty}</span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5" />
              <span>{recipe.prepTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <FireIcon className="w-5 h-5" />
              <span>{recipe.calories} calories</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Ingredients</h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing: RecipeIngredient, index: number) => {
                  const isOwned = ownedIngredients.some(ownedIng => ing.name.toLowerCase().includes(ownedIng));
                  return (
                    <li key={index} className={`flex justify-between items-center p-2 rounded-md ${isOwned ? 'bg-green-50 text-gray-700' : 'bg-red-50 text-gray-600'}`}>
                      <span className="font-medium">{ing.name} <span className="text-gray-500 text-sm">({ing.quantity})</span></span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-semibold text-gray-700">Instructions</h3>
                <div className="flex items-center gap-2">
                  <button onClick={handlePlayPause} className="text-gray-600 hover:text-blue-500 transition">
                    {isSpeaking ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <button onClick={handleStop} className="text-gray-600 hover:text-red-500 transition">
                    <StopIcon />
                  </button>
                </div>
              </div>
              <ol className="space-y-4 list-decimal list-inside text-gray-800">
                {recipe.instructions.map((step, index) => (
                  <li key={index} className={`p-3 rounded-lg transition-all duration-300 text-lg leading-relaxed ${isSpeaking && index === currentStepIndex ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-gray-50'}`}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeModal;