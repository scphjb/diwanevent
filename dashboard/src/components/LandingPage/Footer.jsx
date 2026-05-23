import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, MapPin, Globe, MessageSquare, Send } from 'lucide-react';
import { useLang } from '../../utils/useLang';

const Footer = () => {
    const { i18n } = useTranslation();
    const { L, isRtl } = useLang();

    const languages = [
        { code: 'ar', name: 'AR', dir: 'rtl' },
        { code: 'en', name: 'EN', dir: 'ltr' },
        { code: 'fr', name: 'FR', dir: 'ltr' },
        { code: 'es', name: 'ES', dir: 'ltr' },
    ];

    const changeLanguage = (code) => {
        const lang = languages.find(l => l.code === code);
        i18n.changeLanguage(code);
        document.dir = lang.dir;
    };

    const productLinks = [
        { name: L({ ar: 'الميزات', en: 'Features', fr: 'Fonctionnalités', es: 'Funcionalidades' }), to: '/#features', external: false },
        { name: L({ ar: 'الأسعار', en: 'Pricing', fr: 'Tarifs', es: 'Precios' }), to: '/#pricing', external: false },
        { name: L({ ar: 'الـ API', en: 'API', fr: 'API', es: 'API' }), to: '/api-docs', external: false },
        { name: L({ ar: 'التحديثات', en: 'Updates', fr: 'Mises à jour', es: 'Actualizaciones' }), to: '/updates', external: false },
    ];

    const companyLinks = [
        { name: L({ ar: 'من نحن', en: 'About Us', fr: 'À Propos', es: 'Nosotros' }), to: '/about' },
        { name: L({ ar: 'اتصل بنا', en: 'Contact', fr: 'Contact', es: 'Contacto' }), to: '/contact' },
        { name: L({ ar: 'المدونة', en: 'Blog', fr: 'Blog', es: 'Blog' }), to: '/blog' },
        { name: L({ ar: 'وظائف', en: 'Careers', fr: 'Carrières', es: 'Empleo' }), to: '/jobs' },
    ];

    return (
        <footer className="bg-brand-dark py-20 border-t border-white/5 relative z-10" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

                    {/* Brand Col */}
                    <div className="lg:col-span-1">
                        <Link to="/" className="flex flex-col gap-1 mb-6 w-fit">
                            <span className="text-2xl font-black text-brand-text leading-none tracking-tight">ديوان</span>
                            <span className="text-[10px] font-bold text-brand-secondary tracking-[0.2em]">DIWAN EVENT</span>
                        </Link>
                        <p className="text-sm text-brand-muted leading-relaxed">
                            {L({
                                ar: "المنصة الأولى المتخصصة في إدارة الحضور وتواصل المحترفين في الفعاليات الكبرى.",
                                en: "The first platform specialized in attendance management and professional networking for major events.",
                                fr: "La première plateforme spécialisée dans la gestion de présence et le réseautage professionnel.",
                                es: "La primera plataforma especializada en gestión de asistencia y networking profesional.",
                            })}
                        </p>
                        <div className="flex gap-4 mt-8">
                            {[Globe, Send, MessageSquare].map((Icon, i) => (
                                <a key={i} href="mailto:hello@e-diwan.net" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-brand-muted hover:bg-brand-primary hover:text-white transition-all">
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links Col 1 — Product */}
                    <div>
                        <h4 className="text-brand-text font-black mb-6 uppercase tracking-widest text-xs">{L({ ar: 'المنتج', en: 'Product', fr: 'Produit', es: 'Producto' })}</h4>
                        <ul className="space-y-4">
                            {productLinks.map(link => (
                                <li key={link.name}>
                                    <Link to={link.to} className="text-sm text-brand-muted hover:text-brand-secondary transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Links Col 2 — Company */}
                    <div>
                        <h4 className="text-brand-text font-black mb-6 uppercase tracking-widest text-xs">{L({ ar: 'الشركة', en: 'Company', fr: 'Entreprise', es: 'Empresa' })}</h4>
                        <ul className="space-y-4">
                            {companyLinks.map(link => (
                                <li key={link.name}>
                                    <Link to={link.to} className="text-sm text-brand-muted hover:text-brand-secondary transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Col */}
                    <div>
                        <h4 className="text-brand-text font-black mb-6 uppercase tracking-widest text-xs">{L({ ar: 'تواصل معنا', en: 'Contact Us', fr: 'Contactez-nous', es: 'Contáctenos' })}</h4>
                        <ul className="space-y-4 text-sm text-brand-muted">
                            <li className="flex items-center gap-3">
                                <Mail size={16} className="text-brand-primary shrink-0" />
                                <a href="mailto:hello@e-diwan.net" className="hover:text-brand-secondary transition-colors">hello@e-diwan.net</a>
                            </li>
                            <li className="flex items-center gap-3">
                                <MapPin size={16} className="text-brand-primary shrink-0" />
                                <span>{L({ ar: 'الجزائر العاصمة، الجزائر', en: 'Algiers, Algeria', fr: 'Alger, Algérie', es: 'Argel, Argelia' })}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Globe size={16} className="text-brand-primary shrink-0" />
                                <div className="flex gap-2 flex-wrap">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => changeLanguage(lang.code)}
                                            className={`text-xs font-bold transition-colors ${i18n.language === lang.code ? 'text-brand-secondary' : 'text-brand-muted hover:text-brand-text'}`}
                                        >
                                            {lang.name}
                                        </button>
                                    ))}
                                </div>
                            </li>
                        </ul>
                    </div>

                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-brand-muted font-bold uppercase tracking-widest">
                    <div className="flex gap-6">
                        <Link to="/privacy" className="hover:text-brand-text transition-colors">{L({ ar: 'الخصوصية', en: 'Privacy', fr: 'Confidentialité', es: 'Privacidad' })}</Link>
                        <Link to="/terms"   className="hover:text-brand-text transition-colors">{L({ ar: 'الشروط',    en: 'Terms',   fr: 'Conditions',      es: 'Términos' })}</Link>
                    </div>
                    <div>© 2026 DIWAN EVENT PLATFORM</div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
