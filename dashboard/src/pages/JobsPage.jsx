import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Zap, Globe, TrendingUp, Send, Briefcase, CheckCircle2, Mail } from 'lucide-react';
import Header from '../components/LandingPage/Header';
import Footer from '../components/LandingPage/Footer';
import { useLang } from '../utils/useLang';
import '../styles/landing.css';

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

const JobsPage = () => {
  const { L, isRtl } = useLang();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = `${L({ ar: 'وظائف', en: 'Careers', fr: 'Carrières', es: 'Empleo' })} | Diwan Event`;
    window.scrollTo(0, 0);
  }, []);

  const values = [
    {
      icon: Zap,
      title: L({ ar: 'تأثير حقيقي', en: 'Real Impact', fr: 'Impact Réel', es: 'Impacto Real' }),
      text:  L({ ar: 'كودك يُشغَّل أمام 1,200 شخص في الفعالية القادمة.', en: 'Your code runs in front of 1,200 people at the next event.', fr: 'Votre code s\'exécute devant 1 200 personnes lors du prochain événement.', es: 'Tu código se ejecuta ante 1.200 personas en el próximo evento.' }),
      color: 'from-brand-secondary/20 to-transparent',
    },
    {
      icon: Globe,
      title: L({ ar: 'عمل عن بُعد', en: 'Remote-First', fr: 'Télétravail', es: 'Trabajo Remoto' }),
      text:  L({ ar: 'فريق موزع عبر الجزائر — نقيّم بالنتائج لا بالساعات.', en: 'Distributed team across Algeria — results over hours.', fr: 'Équipe distribuée en Algérie — les résultats, pas les heures.', es: 'Equipo distribuido en Argelia — resultados, no horas.' }),
      color: 'from-brand-primary/20 to-transparent',
    },
    {
      icon: TrendingUp,
      title: L({ ar: 'نمو حقيقي', en: 'Real Growth', fr: 'Vraie Croissance', es: 'Crecimiento Real' }),
      text:  L({ ar: 'تعلّم من بناء SaaS من الصفر حتى الإطلاق.', en: 'Learn from building SaaS from scratch to launch.', fr: 'Apprenez à construire un SaaS de zéro jusqu\'au lancement.', es: 'Aprende a construir un SaaS desde cero hasta el lanzamiento.' }),
      color: 'from-purple-900/20 to-transparent',
    },
  ];

  const handleOpenApplication = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(L({ ar: 'طلب توظيف مفتوح — Diwan Event', en: 'Open Application — Diwan Event', fr: 'Candidature Spontanée — Diwan Event', es: 'Solicitud Abierta — Diwan Event' }));
    const body = encodeURIComponent(`${L({ ar: 'السلام عليكم،\nأودّ التقدم للعمل في Diwan Event.\n\nالاسم: \nالمجال: \nالرابط (GitHub / LinkedIn): \n\nلماذا ديوان:', en: 'Hello,\nI would like to apply to work at Diwan Event.\n\nName:\nField:\nLink (GitHub / LinkedIn):\n\nWhy Diwan:', fr: 'Bonjour,\nJe souhaite postuler chez Diwan Event.\n\nNom :\nDomaine :\nLien (GitHub / LinkedIn) :\n\nPourquoi Diwan :', es: 'Hola,\nMe gustaría postularme en Diwan Event.\n\nNombre:\nCampo:\nEnlace (GitHub / LinkedIn):\n\n¿Por qué Diwan?' })}`);
    window.location.href = `mailto:jobs@diwan.net?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-brand-dark text-brand-text font-sans noise-bg" dir={isRtl ? 'rtl' : 'ltr'}>
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-white/5 py-4 pt-24">
        <div className="container mx-auto px-6">
          <nav className="flex items-center gap-2 text-xs text-brand-muted">
            <Link to="/" className="hover:text-brand-secondary transition-colors">{L({ ar: 'الرئيسية', en: 'Home', fr: 'Accueil', es: 'Inicio' })}</Link>
            <ChevronRight size={12} className={isRtl ? 'rotate-180' : ''} />
            <span className="text-brand-text">{L({ ar: 'وظائف', en: 'Careers', fr: 'Carrières', es: 'Empleo' })}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="py-28 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(26,138,106,0.12)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-secondary/5 rounded-full blur-[100px]" />
        <div className="container mx-auto px-6 relative z-10 max-w-4xl mx-auto">
          <motion.div {...fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 rounded-full border border-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-widest mb-8">
            <Briefcase size={14} />
            <span>{L({ ar: 'نبني مستقبل الفعاليات', en: 'Building the Future of Events', fr: 'Construire l\'Avenir des Événements', es: 'Construyendo el Futuro de los Eventos' })}</span>
          </motion.div>
          <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black text-brand-text mb-8 leading-tight">
            {L({ ar: 'انضم لبناة', en: 'Join the Builders of', fr: 'Rejoignez les Bâtisseurs du', es: 'Únete a los Constructores del' })}{' '}
            <span className="text-brand-secondary">{L({ ar: 'المستقبل الرقمي للفعاليات', en: 'Digital Event Future', fr: 'Futur Numérique des Événements', es: 'Futuro Digital de los Eventos' })}</span>
          </motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-xl text-brand-muted leading-relaxed max-w-2xl mx-auto">
            {L({
              ar: 'نحن فريق صغير يبني منتجاً حقيقياً يُستخدم في أكبر الفعاليات الجزائرية. كل عضو يُحدث فارقاً.',
              en: 'We are a small team building a real product used in Algeria\'s largest events. Every member makes a difference.',
              fr: 'Nous sommes une petite équipe construisant un vrai produit utilisé dans les plus grands événements algériens.',
              es: 'Somos un equipo pequeño construyendo un producto real usado en los mayores eventos de Argelia.',
            })}
          </motion.p>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.h2 {...fadeUp} className="text-3xl md:text-4xl font-black text-center text-brand-text mb-4">
            {L({ ar: 'ماذا يعني العمل في ديوان', en: 'What Working at Diwan Means', fr: 'Ce que Signifie Travailler chez Diwan', es: 'Qué Significa Trabajar en Diwan' })}
          </motion.h2>
          <motion.p {...fadeUp} transition={{ delay: 0.1 }} className="text-center text-brand-muted mb-16 max-w-xl mx-auto">
            {L({ ar: 'ثلاثة مبادئ تحكم كيف نعمل ونبني.', en: 'Three principles that govern how we work and build.', fr: 'Trois principes qui régissent notre façon de travailler et de construire.', es: 'Tres principios que gobiernan cómo trabajamos y construimos.' })}
          </motion.p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {values.map((v, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.15 }}
                className={`p-8 rounded-[2.5rem] bg-gradient-to-br ${v.color} border border-white/8 glass-card hover:border-white/15 transition-all group`}>
                <div className="w-14 h-14 bg-brand-dark/50 rounded-2xl flex items-center justify-center text-brand-secondary mb-6 group-hover:scale-110 transition-transform">
                  <v.icon size={28} />
                </div>
                <h3 className="text-xl font-black text-brand-text mb-4">{v.title}</h3>
                <p className="text-brand-muted text-sm leading-relaxed">{v.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20 bg-brand-surface/10">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.h2 {...fadeUp} className="text-3xl font-black text-center text-brand-text mb-4">
            {L({ ar: 'الوظائف الحالية', en: 'Open Positions', fr: 'Postes Ouverts', es: 'Posiciones Abiertas' })}
          </motion.h2>
          <motion.div {...fadeUp} transition={{ delay: 0.15 }}
            className="mt-12 rounded-[2.5rem] border border-dashed border-white/15 p-16 text-center glass-card">
            <div className="text-6xl mb-6">📭</div>
            <h3 className="text-xl font-black text-brand-text mb-3">
              {L({ ar: 'لا توجد وظائف مفتوحة حالياً', en: 'No Open Positions Right Now', fr: 'Aucun Poste Ouvert Actuellement', es: 'No Hay Posiciones Abiertas Ahora' })}
            </h3>
            <p className="text-brand-muted mb-2">
              {L({ ar: 'لكن الفريق ينمو — تابع الصفحة أو أرسل طلبك المفتوح.', en: 'But the team is growing — follow the page or send an open application.', fr: 'Mais l\'équipe grandit — suivez the page ou envoyez une candidature spontanée.', es: 'Pero el equipo está creciendo — siga la página o envíe una solicitud abierta.' })}
            </p>
            <p className="text-brand-secondary text-sm font-bold">
              {L({ ar: '📭 لا نسخ السير الذاتية إلى الفراغ — نرد على الجميع', en: '📭 No CVs into the void — we reply to everyone', fr: '📭 Pas de CVs dans le vide — nous répondons à tous', es: '📭 Sin CVs al vacío — respondemos a todos' })}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Open Application */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06)_0%,transparent_60%)]" />
        <div className="container mx-auto px-6 relative z-10 max-w-2xl mx-auto text-center">
          <motion.div {...fadeUp} className="w-20 h-20 bg-brand-secondary/10 rounded-full flex items-center justify-center mx-auto mb-8 text-brand-secondary">
            <Send size={32} />
          </motion.div>
          <motion.h2 {...fadeUp} transition={{ delay: 0.1 }} className="text-3xl md:text-4xl font-black text-brand-text mb-4">
            {L({ ar: 'أرسل طلبك المفتوح', en: 'Send an Open Application', fr: 'Envoyez une Candidature Spontanée', es: 'Envíe una Solicitud Abierta' })}
          </motion.h2>
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-brand-muted text-lg mb-10 leading-relaxed">
            {L({
              ar: 'إذا كنت مطوراً، مصمماً، أو شخصاً يؤمن بما نبنيه، أرسل سيرتك الذاتية وتواصل معنا.',
              en: 'If you are a developer, designer, or someone who believes in what we are building, send your CV and connect with us.',
              fr: 'Si vous êtes développeur, designer ou quelqu\'un qui croit en ce que nous construisons, envoyez votre CV et contactez-nous.',
              es: 'Si eres desarrollador, diseñador o alguien que cree en lo que estamos construyendo, envía tu CV y contáctanos.'
            })}
          </motion.p>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card rounded-3xl p-10 border border-brand-primary/30 text-center"
              >
                <CheckCircle2 size={48} className="text-brand-primary mx-auto mb-4" />
                <h3 className="text-xl font-black text-brand-text mb-2">
                  {L({ ar: 'تم فتح البريد الإلكتروني!', en: 'Email client opened!', fr: 'Client email ouvert !', es: '¡Cliente de email abierto!' })}
                </h3>
                <p className="text-brand-muted">
                  {L({ ar: 'أرسل طلبك وسنرد بالتأكيد.', en: 'Send your application — we\'ll definitely reply.', fr: 'Envoyez votre candidature — nous répondrons certainement.', es: 'Envíe su solicitud — definitivamente responderemos.' })}
                </p>
              </motion.div>
            ) : (
              <motion.div key="cta" className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleOpenApplication}
                  className="flex items-center justify-center gap-3 px-10 py-5 bg-brand-secondary text-brand-dark font-black rounded-full hover:bg-brand-secondary/90 hover:scale-105 transition-all shadow-2xl shadow-brand-secondary/20 text-lg"
                >
                  <Mail size={20} />
                  {L({ ar: 'أرسل طلبك لـ jobs@diwan.net', en: 'Apply to jobs@diwan.net', fr: 'Postuler à jobs@diwan.net', es: 'Postular a jobs@diwan.net' })}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p {...fadeUp} transition={{ delay: 0.3 }} className="mt-8 text-xs text-brand-muted">
            {L({ ar: 'أو زر صفحة', en: 'Or visit our', fr: 'Ou visitez notre', es: 'O visita nuestra' })}{' '}
            <Link to="/about" className="text-brand-secondary hover:underline">
              {L({ ar: '"من نحن"', en: '"About Us"', fr: '"À Propos"', es: '"Nosotros"' })}
            </Link>
            {' '}{L({ ar: 'للتعرف أكثر على الفريق', en: 'to learn more about the team', fr: 'pour en savoir plus sur l\'équipe', es: 'para conocer más sobre el equipo' })}
          </motion.p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default JobsPage;
