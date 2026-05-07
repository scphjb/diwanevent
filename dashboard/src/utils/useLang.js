import { useTranslation } from 'react-i18next';

/**
 * Helper hook for multilingual text across 4 languages (AR, EN, FR, ES).
 * Returns a function `L` that takes an object with language keys and returns the appropriate text.
 * Usage: L({ ar: "عربي", en: "English", fr: "Français", es: "Español" })
 */
export const useLang = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'ar';
  const isRtl = lang === 'ar';

  const L = (translations) => {
    return translations[lang] || translations.en || translations.ar || '';
  };

  return { L, lang, isRtl, i18n };
};
