
import React from 'react';

interface LanguageToggleProps {
  currentLang: 'en' | 'hi';
  onToggle: (lang: 'en' | 'hi') => void;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ currentLang, onToggle }) => {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 border border-slate-200">
      <button 
        onClick={() => onToggle('en')}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${currentLang === 'en' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
      >
        English
      </button>
      <button 
        onClick={() => onToggle('hi')}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${currentLang === 'hi' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
      >
        हिन्दी
      </button>
    </div>
  );
};
