import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '../../utils/cn';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  };

  const languages = [
    { code: 'ar', label: 'العربية' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' }
  ];

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-white/5 rounded-2xl border border-white/5 mt-4">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
            i18n.language === lang.code 
              ? "bg-amber-500 text-emerald-950 border-amber-500" 
              : "text-emerald-400/50 border-white/10 hover:border-emerald-500/30"
          )}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
