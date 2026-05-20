import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, BookOpen, Clock, Tag, Sparkles, Bell, CheckCircle2 } from 'lucide-react';
import Header from '../components/LandingPage/Header';
import Footer from '../components/LandingPage/Footer';
import { useLang } from '../utils/useLang';
import '../styles/landing.css';

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

const BlogPage = () => {
  const { L, isRtl } = useLang();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    document.title = `${L({ ar: 'المدونة', en: 'Blog', fr: 'Blog', es: 'Blog' })} | Diwan Event`;
    window.scrollTo(0, 0);
  }, []);

  const posts = [
    {
      tag:     L({ ar: 'إدارة الفعاليات', en: 'Event Management', fr: 'Gestion d\'Événements', es: 'Gestión de Eventos' }),
      title:   L({ ar: 'كيف تحولت إدارة 1,200 محضر قضائي من 3 ساعات إلى 40 دقيقة', en: 'How Managing 1,200 Judicial Officers Changed from 3 Hours to 40 Minutes', fr: 'Comment la Gestion de 1 200 Officiers Judiciaires est Passée de 3h à 40min', es: 'Cómo Gestionar 1.200 Funcionarios Judiciales Pasó de 3 Horas a 40 Minutos' }),
      excerpt: L({ ar: 'قصة حقيقية من الجمعية العامة للغرفة الجهوية للمحضرين القضائيين بالشرق 2026 — كيف انتقلنا من التنظيم التقليدي إلى الأتمتة الكاملة.', en: 'A real story from the 2026 Regional Chamber of Judicial Officers of the East General Assembly — how we transitioned from traditional organization to full automation.', fr: 'Une histoire vraie de l\'Assemblée Générale 2026 de la Chambre Régionale des Huissiers de Justice de l\'Est.', es: 'Una historia real de la Asamblea General 2026 de la Cámara Regional de Funcionarios Judiciales del Este.' }),
      date:    L({ ar: 'مايو 2026', en: 'May 2026', fr: 'Mai 2026', es: 'Mayo 2026' }),
      readTime: '5',
      coming:  false,
      gradient: 'from-brand-primary/20 to-brand-dark',
      color:   'text-brand-primary',
    },
    {
      tag:     L({ ar: 'تقنية', en: 'Technology', fr: 'Technologie', es: 'Tecnología' }),
      title:   L({ ar: 'لماذا اخترنا FastAPI + React لبناء أسرع منصة فعاليات', en: 'Why We Chose FastAPI + React for the Fastest Event Platform', fr: 'Pourquoi Nous Avons Choisi FastAPI + React pour la Plateforme la Plus Rapide', es: 'Por Qué Elegimos FastAPI + React para la Plataforma de Eventos Más Rápida' }),
      excerpt: L({ ar: 'القرارات التقنية التي أبقت المنصة تحت 500ms تحت ضغط 1000 مستخدم...', en: 'Technical decisions that kept the platform under 500ms under 1,000 concurrent users...', fr: 'Les décisions techniques qui ont maintenu la plateforme sous 500ms avec 1 000 utilisateurs...', es: 'Decisiones técnicas que mantuvieron la plataforma bajo 500ms con 1.000 usuarios...' }),
      date:    L({ ar: 'قريباً', en: 'Coming Soon', fr: 'Bientôt', es: 'Próximamente' }),
      readTime: '8',
      coming:  true,
      gradient: 'from-brand-secondary/10 to-brand-dark',
      color:   'text-brand-secondary',
    },
    {
      tag:     L({ ar: 'نصائح', en: 'Tips', fr: 'Conseils', es: 'Consejos' }),
      title:   L({ ar: '10 أخطاء يرتكبها منظمو الفعاليات عند إدارة الحضور', en: '10 Mistakes Event Organizers Make with Attendance Management', fr: '10 Erreurs des Organisateurs lors de la Gestion des Présences', es: '10 Errores que Cometen los Organizadores de Eventos en la Gestión de Asistencia' }),
      excerpt: L({ ar: 'من تجربة مئات الفعاليات: هذه الأخطاء تكلف ساعات من الجهد المهدور...', en: 'From hundreds of events: these mistakes cost hours of wasted effort...', fr: 'D\'après des centaines d\'événements : ces erreurs coûtent des heures d\'efforts inutiles...', es: 'Desde cientos de eventos: estos errores cuestan horas de esfuerzo inútil...' }),
      date:    L({ ar: 'قريباً', en: 'Coming Soon', fr: 'Bientôt', es: 'Próximamente' }),
      readTime: '6',
      coming:  true,
      gradient: 'from-purple-900/20 to-brand-dark',
      color:   'text-purple-400',
    },
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
            <span className="text-brand-text">{L({ ar: 'المدونة', en: 'Blog', fr: 'Blog', es: 'Blog' })}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(26,138,106,0.1)_0%,transparent_60%)]" />
        <div className="container mx-auto px-6 relative z-10 max-w-3xl mx-auto">
          <motion.div {...fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 rounded-full border border-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-widest mb-6">
            <BookOpen size={14} />
            <span>{L({ ar: 'رؤى من الميدان', en: 'Insights from the Field', fr: 'Perspectives du Terrain', es: 'Perspectivas del Campo' })}</span>
          </motion.div>
          <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black text-brand-text mb-6">
            {L({ ar: 'رؤى من قلب', en: 'Insights from the', fr: 'Perspectives du Cœur des', es: 'Perspectivas del Corazón de los' })}{' '}
            <span className="text-brand-secondary">{L({ ar: 'الفعاليات الكبرى', en: 'Major Events', fr: 'Grands Événements', es: 'Grandes Eventos' })}</span>
          </motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-brand-muted text-lg">
            {L({ ar: 'تجارب حقيقية، قرارات تقنية، ونصائح عملية من منظمي الفعاليات.', en: 'Real experiences, technical decisions, and practical tips from event organizers.', fr: 'Expériences réelles, décisions techniques et conseils pratiques d\'organisateurs.', es: 'Experiencias reales, decisiones técnicas y consejos prácticos de organizadores.' })}
          </motion.p>
        </div>
      </div>

      <main className="relative z-10 pb-24">
        <div className="container mx-auto px-6 max-w-5xl">

          {/* Posts Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-24">
            {posts.map((post, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-[2.5rem] overflow-hidden border border-white/8 glass-card group hover:border-white/15 transition-all ${post.coming ? 'opacity-80' : ''}`}
              >
                {/* Gradient Header */}
                <div className={`h-40 bg-gradient-to-br ${post.gradient} relative flex items-end p-6`}>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-brand-dark/60 backdrop-blur-sm text-xs font-bold ${post.color}`}>
                    <Tag size={10} />
                    <span>{post.tag}</span>
                  </div>
                  {post.coming && (
                    <div className="absolute top-4 end-4 px-3 py-1 rounded-full bg-brand-secondary/20 border border-brand-secondary/40 text-brand-secondary text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Sparkles size={10} />
                      <span>{L({ ar: 'قريباً', en: 'Coming Soon', fr: 'Bientôt', es: 'Próximamente' })}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-black text-brand-text text-base leading-snug mb-3 group-hover:text-brand-secondary transition-colors line-clamp-3">
                    {post.title}
                  </h3>
                  <p className="text-brand-muted text-sm leading-relaxed mb-6 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-brand-muted">
                    <span className="flex items-center gap-1"><Clock size={12} />{post.readTime} min</span>
                    <span>{post.date}</span>
                  </div>
                  {!post.coming && (
                    <button className="mt-4 w-full py-3 rounded-xl bg-brand-primary/10 text-brand-primary font-bold text-sm hover:bg-brand-primary/20 transition-all flex items-center justify-center gap-2">
                      {L({ ar: 'اقرأ المقال', en: 'Read Article', fr: 'Lire l\'Article', es: 'Leer Artículo' })}
                      <ChevronRight size={14} className={isRtl ? 'rotate-180' : ''} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Newsletter Subscribe */}
          <motion.div {...fadeUp} className="glass-card rounded-[3rem] p-12 border border-brand-secondary/20 bg-gradient-to-br from-brand-secondary/5 to-transparent text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-brand-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-secondary">
              <Bell size={28} />
            </div>
            <h2 className="text-2xl font-black text-brand-text mb-3">
              {L({ ar: 'اشترك لتصلك المقالات أولاً', en: 'Subscribe to Get Articles First', fr: 'Abonnez-vous pour Recevoir les Articles en Premier', es: 'Suscríbase para Recibir Artículos Primero' })}
            </h2>
            <p className="text-brand-muted mb-8">
              {L({ ar: 'لا spam — فقط محتوى قيّم عن إدارة الفعاليات.', en: 'No spam — only valuable content about event management.', fr: 'Pas de spam — uniquement du contenu de valeur sur la gestion d\'événements.', es: 'Sin spam — solo contenido valioso sobre gestión de eventos.' })}
            </p>
            {subscribed ? (
              <div className="flex items-center justify-center gap-2 text-brand-primary font-bold">
                <CheckCircle2 size={20} />
                {L({ ar: 'تم الاشتراك! سنتواصل معك قريباً.', en: 'Subscribed! We\'ll be in touch soon.', fr: 'Abonné ! Nous vous contacterons bientôt.', es: '¡Suscrito! Estaremos en contacto pronto.' })}
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={L({ ar: 'بريدك الإلكتروني', en: 'Your email', fr: 'Votre email', es: 'Su email' })}
                  className="flex-1 bg-brand-dark/60 border border-white/10 rounded-full px-5 py-3 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-secondary transition-all text-sm"
                />
                <button type="submit" className="px-6 py-3 bg-brand-secondary text-brand-dark font-black rounded-full hover:bg-brand-secondary/90 transition-all shrink-0">
                  {L({ ar: 'اشترك', en: 'Subscribe', fr: 'S\'abonner', es: 'Suscribirse' })}
                </button>
              </form>
            )}
          </motion.div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPage;
