import { createContext, useState, useCallback } from 'react';
import uz from '../i18n/uz.js';
import ru from '../i18n/ru.js';
import en from '../i18n/en.js';

const LANGS = { uz, ru, en };

export const LangContext = createContext({
  lang: 'uz',
  setLang: () => {},
  t: (k) => k,
});

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('sf_lang') || 'uz');

  const changeLang = useCallback((l) => {
    localStorage.setItem('sf_lang', l);
    setLang(l);
  }, []);

  const t = useCallback((key) => LANGS[lang]?.[key] || LANGS.en?.[key] || key, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LangContext.Provider>
  );
}
