import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from './i18n';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  setLanguage: (lang: Language) => void;
  t: typeof translations['th'];
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'th',
  setLang: () => {},
  setLanguage: () => {},
  t: translations.th,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Thai ('th') as requested by user
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('solo_system_lang');
    return (saved === 'en' || saved === 'th') ? saved : 'th';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('solo_system_lang', newLang);
  };

  const t = translations[lang] || translations.th;

  return (
    <LanguageContext.Provider value={{ lang, setLang, setLanguage: setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
