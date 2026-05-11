import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hi from './locales/hi.json';
import te from './locales/te.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      english: { translation: en },
      hindi: { translation: hi },
      telugu: { translation: te },
      tamil: { translation: en }, // Fallback to english for now
      punjabi: { translation: en } // Fallback to english for now
    },
    fallbackLng: 'english',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
