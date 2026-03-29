import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./messages/en.json";
import id from "./messages/id.json";

i18n
  .use(LanguageDetector) // deteksi bahasa dari browser
  .use(initReactI18next) // integrasi dengan React
  .init({
    resources: {
      en: { translation: en },
      id: { translation: id },
    },
    fallbackLng: "id", // default bahasa Indonesia
    interpolation: {
      escapeValue: false, // React sudah handle XSS
    },
  });

export default i18n;
