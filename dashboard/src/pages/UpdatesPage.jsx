import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Zap, Shield, Wrench, GitCommit, Filter } from 'lucide-react';
import Header from '../components/LandingPage/Header';
import Footer from '../components/LandingPage/Footer';
import { useLang } from '../utils/useLang';
import '../styles/landing.css';

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

const BADGE_CONFIG = {
  major:   { label: 'MAJOR',   cls: 'bg-brand-secondary/20 text-brand-secondary border-brand-secondary/30', icon: Zap },
  minor:   { label: 'MINOR',   cls: 'bg-brand-primary/20 text-brand-primary border-brand-primary/30', icon: GitCommit },
  fix:     { label: 'FIX',     cls: 'bg-red-900/20 text-red-400 border-red-800/30', icon: Wrench },
  security:{ label: 'SECURITY',cls: 'bg-orange-900/20 text-orange-400 border-orange-800/30', icon: Shield },
  initial: { label: 'INITIAL', cls: 'bg-white/10 text-white/60 border-white/10', icon: GitCommit },
};

const CHANGELOG_RAW = [
  {
    version: 'v4.0', date_ar: 'مايو 2026', date_en: 'May 2026', date_fr: 'Mai 2026', date_es: 'Mayo 2026', type: 'major',
    title_ar: 'الإطلاق الرسمي — نضج كامل', title_en: 'Official Launch — Full Maturity', title_fr: 'Lancement Officiel — Maturité Complète', title_es: 'Lanzamiento Oficial — Madurez Completa',
    changes_ar: ['نظام تواصل مهني كامل مع تشفير AES', 'مصمم الشارات والشهادات WYSIWYG', 'Load Testing ناجح لـ 1,200 مستخدم متزامن', 'Async Database Engine للأداء العالي'],
    changes_en: ['Complete professional networking with AES encryption', 'WYSIWYG Badge & Certificate Designer', 'Successful load test for 1,200 concurrent users', 'Async Database Engine for high performance'],
    changes_fr: ['Réseau professionnel complet avec chiffrement AES', 'Concepteur de badges et certificats WYSIWYG', 'Test de charge réussi pour 1 200 utilisateurs simultanés', 'Moteur de base de données asynchrone hautes performances'],
    changes_es: ['Red profesional completa con cifrado AES', 'Diseñador WYSIWYG de acreditaciones y certificados', 'Test de carga exitoso para 1.200 usuarios simultáneos', 'Motor de base de datos asíncrono de alto rendimiento'],
  },
  {
    version: 'v3.5', date_ar: 'أبريل 2026', date_en: 'April 2026', date_fr: 'Avril 2026', date_es: 'Abril 2026', type: 'major',
    title_ar: 'بوابة المشارك والجدار الاجتماعي', title_en: 'Participant Portal & Social Wall', title_fr: 'Portail Participant & Mur Social', title_es: 'Portal del Participante y Muro Social',
    changes_ar: ['بوابة شخصية لكل مشارك بـ QR', 'جدار اجتماعي مباشر في قاعة الفعالية', 'نظام الرعاة مع Carousel ذكي'],
    changes_en: ['Personal portal for each participant via QR', 'Live social wall in the event venue', 'Smart sponsor carousel system'],
    changes_fr: ['Portail personnel pour chaque participant via QR', 'Mur social en direct dans la salle', 'Système de carousel de sponsors intelligent'],
    changes_es: ['Portal personal para cada participante via QR', 'Muro social en vivo en el recinto', 'Sistema de carrusel de patrocinadores inteligente'],
  },
  {
    version: 'v3.0', date_ar: 'مارس 2026', date_en: 'March 2026', date_fr: 'Mars 2026', date_es: 'Marzo 2026', type: 'major',
    title_ar: 'الثورة المعمارية — FastAPI + React', title_en: 'Architectural Revolution — FastAPI + React', title_fr: 'Révolution Architecturale — FastAPI + React', title_es: 'Revolución Arquitectónica — FastAPI + React',
    changes_ar: ['انتقال كامل من monolith إلى modular architecture', 'JWT Authentication + RBAC', 'Alembic Migrations + PostgreSQL'],
    changes_en: ['Full migration from monolith to modular architecture', 'JWT Authentication + Role-Based Access Control', 'Alembic Migrations + PostgreSQL'],
    changes_fr: ['Migration complète vers une architecture modulaire', 'Authentification JWT + RBAC', 'Migrations Alembic + PostgreSQL'],
    changes_es: ['Migración completa a arquitectura modular', 'Autenticación JWT + Control de Acceso Basado en Roles', 'Migraciones Alembic + PostgreSQL'],
  },
  {
    version: 'v2.0', date_ar: 'يناير 2026', date_en: 'January 2026', date_fr: 'Janvier 2026', date_es: 'Enero 2026', type: 'minor',
    title_ar: 'نظام التحليلات والتقارير', title_en: 'Analytics & Reports System', title_fr: 'Système d\'Analyses et Rapports', title_es: 'Sistema de Análisis e Informes',
    changes_ar: ['لوحة إحصائيات WebSocket مباشرة', 'محضر رسمي PDF بالعربية', 'استيراد/تصدير Excel'],
    changes_en: ['Live WebSocket analytics dashboard', 'Official PDF minutes in Arabic', 'Excel import/export'],
    changes_fr: ['Tableau de bord WebSocket en direct', 'Procès-verbal PDF officiel en arabe', 'Import/export Excel'],
    changes_es: ['Panel de análisis WebSocket en vivo', 'Actas PDF oficiales en árabe', 'Importación/exportación Excel'],
  },
  {
    version: 'v1.0', date_ar: 'نوفمبر 2025', date_en: 'November 2025', date_fr: 'Novembre 2025', date_es: 'Noviembre 2025', type: 'initial',
    title_ar: 'الإطلاق الأول — 200 مشارك', title_en: 'First Launch — 200 Participants', title_fr: 'Premier Lancement — 200 Participants', title_es: 'Primer Lanzamiento — 200 Participantes',
    changes_ar: ['تسجيل حضور QR أساسي', 'توليد شارات PDF', 'لوحة تحكم Admin'],
    changes_en: ['Basic QR attendance registration', 'PDF badge generation', 'Admin control panel'],
    changes_fr: ['Enregistrement de présence QR de base', 'Génération de badges PDF', 'Panneau de contrôle administrateur'],
    changes_es: ['Registro de asistencia QR básico', 'Generación de acreditaciones PDF', 'Panel de control de administrador'],
  },
];

const UpdatesPage = () => {
  const { L, isRtl, lang } = useLang();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    document.title = `${L({ ar: 'سجل التحديثات', en: 'Changelog', fr: 'Journal des Mises à Jour', es: 'Historial de Actualizaciones' })} | Diwan Event`;
    window.scrollTo(0, 0);
  }, []);

  const getLocalized = (entry, field) => entry[`${field}_${lang}`] || entry[`${field}_en`];

  const filtered = filter === 'all' ? CHANGELOG_RAW : CHANGELOG_RAW.filter(e => e.type === filter);

  const FILTERS = [
    { val: 'all',     label: L({ ar: 'الكل', en: 'All', fr: 'Tout', es: 'Todo' }) },
    { val: 'major',   label: L({ ar: 'رئيسي', en: 'Major', fr: 'Majeur', es: 'Mayor' }) },
    { val: 'minor',   label: L({ ar: 'ثانوي', en: 'Minor', fr: 'Mineur', es: 'Menor' }) },
    { val: 'fix',     label: L({ ar: 'إصلاح', en: 'Fix', fr: 'Correctif', es: 'Corrección' }) },
    { val: 'initial', label: L({ ar: 'أولي', en: 'Initial', fr: 'Initial', es: 'Inicial' }) },
  ];

  return (
    <div className="min-h-screen bg-brand-dark text-brand-text font-sans noise-bg" dir={isRtl ? 'rtl' : 'ltr'}>
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-white/5 py-4 pt-24">
        <div className="container mx-auto px-6">
          <nav className="flex items-center gap-2 text-xs text-brand-muted">
            <Link to="/" className="hover:text-brand-secondary transition-colors">{L({ ar: 'الرئيسية', en: 'Home', fr: 'Accueil', es: 'Inicio' })}</Link>
            <ChevronRight size={12} className={isRtl ? 'rotate-180' : ''} />
            <span className="text-brand-text">{L({ ar: 'التحديثات', en: 'Updates', fr: 'Mises à Jour', es: 'Actualizaciones' })}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08)_0%,transparent_60%)]" />
        <div className="container mx-auto px-6 relative z-10 max-w-3xl mx-auto">
          <motion.div {...fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-secondary/10 rounded-full border border-brand-secondary/20 text-brand-secondary text-xs font-bold uppercase tracking-widest mb-6">
            <GitCommit size={14} />
            <span>{L({ ar: 'شفافية كاملة في التطوير', en: 'Full Development Transparency', fr: 'Transparence Totale du Développement', es: 'Transparencia Total en el Desarrollo' })}</span>
          </motion.div>
          <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black text-brand-text mb-4">
            {L({ ar: 'سجل', en: 'Change', fr: 'Journal des', es: 'Historial de' })}{' '}
            <span className="text-brand-secondary">{L({ ar: 'التحديثات', en: 'log', fr: 'Mises à Jour', es: 'Actualizaciones' })}</span>
          </motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-brand-muted">
            {L({ ar: 'كل تحديث وتطوير منذ البداية — بشفافية تامة.', en: 'Every update and improvement since the beginning — total transparency.', fr: 'Chaque mise à jour depuis le début — transparence totale.', es: 'Cada actualización desde el principio — transparencia total.' })}
          </motion.p>
        </div>
      </div>

      <main className="relative z-10 pb-24">
        <div className="container mx-auto px-6 max-w-3xl">

          {/* Filters */}
          <motion.div {...fadeUp} className="flex flex-wrap gap-2 mb-12">
            <Filter size={16} className="text-brand-muted mt-2" />
            {FILTERS.map(f => (
              <button
                key={f.val}
                onClick={() => setFilter(f.val)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${filter === f.val ? 'bg-brand-secondary text-brand-dark border-brand-secondary' : 'border-white/10 text-brand-muted hover:border-white/30'}`}
              >
                {f.label}
              </button>
            ))}
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute start-[20px] top-0 bottom-0 w-px bg-gradient-to-b from-brand-secondary via-brand-primary to-transparent" />

            <AnimatePresence>
              {filtered.map((entry, idx) => {
                const badge = BADGE_CONFIG[entry.type] || BADGE_CONFIG.minor;
                const BadgeIcon = badge.icon;
                const changes = getLocalized(entry, 'changes');
                return (
                  <motion.div
                    key={entry.version}
                    initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex gap-8 mb-12"
                  >
                    {/* Node */}
                    <div className="relative z-10 shrink-0">
                      <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${badge.cls}`}>
                        <BadgeIcon size={16} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 glass-card rounded-[2rem] p-8 border border-white/8 hover:border-white/15 transition-all">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="text-2xl font-black text-brand-text">{entry.version}</span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${badge.cls}`}>{badge.label}</span>
                        <span className="text-xs text-brand-muted ms-auto">{getLocalized(entry, 'date')}</span>
                      </div>
                      <h3 className="text-lg font-bold text-brand-secondary mb-5">{getLocalized(entry, 'title')}</h3>
                      <ul className="space-y-3">
                        {(Array.isArray(changes) ? changes : []).map((c, ci) => (
                          <li key={ci} className="flex items-start gap-3 text-sm text-brand-muted">
                            <div className="w-5 h-5 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-primary shrink-0 mt-0.5">
                              <ChevronRight size={12} />
                            </div>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UpdatesPage;
