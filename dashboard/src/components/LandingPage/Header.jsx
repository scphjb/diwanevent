import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LayoutDashboard, Globe, ChevronDown } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useLang } from '../../utils/useLang';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const { L, isRtl, i18n } = useLang();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const languages = [
    { code: 'ar', name: 'العربية', dir: 'rtl' },
    { code: 'en', name: 'English', dir: 'ltr' },
    { code: 'fr', name: 'Français', dir: 'ltr' },
    { code: 'es', name: 'Español', dir: 'ltr' },
  ];

  const changeLanguage = (code) => {
    const lang = languages.find(l => l.code === code);
    i18n.changeLanguage(code);
    document.dir = lang.dir;
    setIsLangMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { name: L({ ar: 'الحلول', en: 'Solutions', fr: 'Solutions', es: 'Soluciones' }), href: '/#solutions', type: 'scroll' },
    { name: L({ ar: 'المميزات', en: 'Features', fr: 'Fonctionnalités', es: 'Características' }), href: '/#features', type: 'scroll' },
    { name: L({ ar: 'العتاد', en: 'Hardware', fr: 'Matériel', es: 'Hardware' }), href: '/#hardware', type: 'scroll' },
    { name: L({ ar: 'الأسعار', en: 'Pricing', fr: 'Tarifs', es: 'Precios' }), href: '/#pricing', type: 'scroll' },
    { name: L({ ar: 'المدونة', en: 'Blog', fr: 'Blog', es: 'Blog' }), href: '/blog', type: 'link' },
    { name: L({ ar: 'الـ API', en: 'API', fr: 'API', es: 'API' }), href: '/api-docs', type: 'link' },
  ];

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-brand-dark/90 backdrop-blur-xl shadow-2xl py-3' : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <div className="flex flex-col gap-1 cursor-pointer" onClick={() => navigate('/')}>
          <span className="text-2xl font-black text-brand-text leading-none tracking-tight">
            {L({ ar: 'ديوان', en: 'DIWAN', fr: 'DIWAN', es: 'DIWAN' })}
          </span>
          <span className="text-[10px] font-bold text-brand-secondary tracking-[0.2em]">DIWAN EVENT</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            link.type === 'link'
              ? <Link key={link.name} to={link.href} className="text-sm font-medium text-brand-muted hover:text-brand-secondary transition-colors">{link.name}</Link>
              : <a key={link.name} href={link.href} className="text-sm font-medium text-brand-muted hover:text-brand-secondary transition-colors">{link.name}</a>
          ))}
          <div className="flex items-center gap-2 px-3 py-1 bg-brand-primary/10 rounded-full border border-brand-primary/20">
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">
              {L({ ar: 'مباشر الآن', en: 'Live Now', fr: 'En direct', es: 'En vivo' })}
            </span>
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="p-2 text-brand-text/60 hover:text-brand-secondary transition-colors flex items-center gap-2 font-bold text-xs"
            >
              <Globe size={16} />
              <span>{currentLang.name}</span>
              <ChevronDown size={14} className={`transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {isLangMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`absolute top-full mt-2 bg-brand-surface border border-white/10 rounded-2xl p-2 min-w-[120px] shadow-2xl glass-card ${isRtl ? 'left-0' : 'right-0'}`}
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full ${isRtl ? 'text-right' : 'text-left'} p-3 rounded-xl text-xs font-bold transition-all hover:bg-white/5 ${
                        i18n.language === lang.code ? 'text-brand-secondary bg-brand-secondary/10' : 'text-brand-text/60'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {localStorage.getItem('diwan_token') ? (
            <button 
              onClick={() => {
                const user = JSON.parse(localStorage.getItem('diwan_user') || '{}');
                navigate(user.role === 'super_admin' ? '/super-admin' : '/dashboard');
              }}
              className="text-sm font-bold bg-brand-primary text-white px-8 py-2 rounded-full hover:bg-brand-primary/80 shadow-lg shadow-brand-primary/20 transition-all flex items-center gap-2"
            >
              <LayoutDashboard size={16} />
              <span>{L({ ar: 'لوحة التحكم', en: 'Dashboard', fr: 'Tableau de bord', es: 'Panel de control' })}</span>
            </button>
          ) : (
            <>
              <button 
                onClick={() => navigate('/login')}
                className="text-sm font-bold text-brand-text px-6 py-2 border border-brand-secondary/30 rounded-full hover:bg-brand-secondary/10 transition-all"
              >
                {L({ ar: 'تسجيل الدخول', en: 'Login', fr: 'Connexion', es: 'Iniciar sesión' })}
              </button>
              <button 
                onClick={() => navigate('/request-demo')}
                className="text-sm font-bold bg-brand-secondary text-brand-dark px-8 py-2 rounded-full hover:bg-brand-gold-light shadow-lg shadow-brand-secondary/20 transition-all"
              >
                {L({ ar: 'طلب عرض', en: 'Request Demo', fr: 'Demander une démo', es: 'Solicitar demo' })}
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-brand-text"
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-brand-dark border-b border-brand-secondary/10 p-6 flex flex-col gap-6 md:hidden glass-card"
          >
            {navLinks.map((link) => (
              link.type === 'link'
                ? <Link key={link.name} to={link.href} className={`text-lg font-bold text-brand-text border-b border-white/5 pb-2`} onClick={() => setIsMobileMenuOpen(false)}>{link.name}</Link>
                : <a key={link.name} href={link.href} className={`text-lg font-bold text-brand-text border-b border-white/5 pb-2`} onClick={() => setIsMobileMenuOpen(false)}>{link.name}</a>
            ))}
            
            {/* Mobile Languages */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`p-3 rounded-xl text-sm font-bold border ${
                    i18n.language === lang.code ? 'border-brand-secondary text-brand-secondary bg-brand-secondary/10' : 'border-white/5 text-brand-text/60'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <button 
                onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}
                className="w-full py-4 text-brand-text font-bold border border-brand-secondary/20 rounded-xl"
              >
                {L({ ar: 'تسجيل الدخول', en: 'Login', fr: 'Connexion', es: 'Iniciar sesión' })}
              </button>
              <button 
                onClick={() => { navigate('/register'); setIsMobileMenuOpen(false); }}
                className="w-full py-4 bg-brand-secondary text-brand-dark font-bold rounded-xl shadow-xl"
              >
                {L({ ar: 'ابدأ مجاناً', en: 'Get Started', fr: 'Commencer', es: 'Empezar gratis' })}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Header;
