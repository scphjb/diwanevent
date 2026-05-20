import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { ChevronRight, Sparkles, Heart, Lock, Lightbulb, Users, MapPin, Calendar } from 'lucide-react';
import Header from '../components/LandingPage/Header';
import Footer from '../components/LandingPage/Footer';
import { useLang } from '../utils/useLang';
import '../styles/landing.css';

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

// Animated counter component
const Counter = ({ from = 0, to, suffix = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(from);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = React.useState(from);

  useEffect(() => {
    if (inView) motionVal.set(to);
  }, [inView, to, motionVal]);

  useEffect(() => spring.on('change', v => setDisplay(Math.round(v))), [spring]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
};

const AboutPage = () => {
  const { L, isRtl } = useLang();

  useEffect(() => {
    document.title = `${L({ ar: 'من نحن', en: 'About Us', fr: 'À Propos', es: 'Nosotros' })} | Diwan Event`;
    window.scrollTo(0, 0);
  }, []);

  const values = [
    {
      icon: Heart,
      title: L({ ar: 'عربية أولاً', en: 'Arabic First', fr: 'Arabe en Premier', es: 'Árabe Primero' }),
      text: L({ ar: 'بُنيت لتفهم الأسماء والمسميات العربية بشكل صحيح — لا عكس، لا تقطيع.', en: 'Built to correctly understand Arabic names and titles — no reversal, no breakage.', fr: 'Conçu pour comprendre correctement les noms arabes — sans inversion ni coupure.', es: 'Construido para entender correctamente los nombres árabes — sin reversión ni cortes.' }),
      color: 'from-brand-secondary/20 to-orange-900/10',
    },
    {
      icon: Lock,
      title: L({ ar: 'الخصوصية قبل كل شيء', en: 'Privacy First', fr: 'La Confidentialité Avant Tout', es: 'Privacidad Ante Todo' }),
      text: L({ ar: 'بياناتك لا تغادر حدودنا. لا مشاركة، لا بيع، لا إعلانات.', en: 'Your data never leaves our boundaries. No sharing, no selling, no ads.', fr: 'Vos données ne quittent jamais nos frontières. Pas de partage, vente ou publicités.', es: 'Sus datos nunca abandonan nuestros límites. Sin compartir, vender ni anuncios.' }),
      color: 'from-brand-primary/20 to-teal-900/10',
    },
    {
      icon: Lightbulb,
      title: L({ ar: 'تبسيط المعقد', en: 'Simplify the Complex', fr: 'Simplifier le Complexe', es: 'Simplificar lo Complejo' }),
      text: L({ ar: 'التقنية في خدمة المنظم، لا العكس. كل ميزة قُصّت لتُحل مشكلة حقيقية.', en: 'Technology serves the organizer, not the reverse. Every feature solves a real problem.', fr: 'La technologie est au service de l\'organisateur. Chaque fonctionnalité résout un vrai problème.', es: 'La tecnología sirve al organizador. Cada función resuelve un problema real.' }),
      color: 'from-purple-900/20 to-brand-primary/10',
    },
  ];

  const timeline = [
    { year: '2024', text: L({ ar: 'فكرة بُنيت من خلف قاعة الفعالية', en: 'An idea born behind the event hall', fr: 'Une idée née derrière la salle d\'événements', es: 'Una idea nacida detrás del salón de eventos' }) },
    { year: '2025', text: L({ ar: 'أول نسخة تجريبية لـ 200 مشارك', en: 'First beta version for 200 participants', fr: 'Première version bêta pour 200 participants', es: 'Primera versión beta para 200 participantes' }) },
    { year: '2026', text: L({ ar: 'منصة كاملة لـ 1,200+ مشارك في الجمعية العامة للغرفة الجهوية للمحضرين القضائيين بالشرق', en: 'Full platform for 1,200+ participants at the Regional Chamber of Judicial Officers of the East General Assembly', fr: 'Plateforme complète pour 1 200+ participants à l\'Assemblée Générale de la Chambre Régionale des Huissiers de Justice de l\'Est', es: 'Plataforma completa para más de 1.200 participantes en la Asamblea General de la Cámara Regional de Funcionarios Judiciales del Este' }) },
  ];

  const stats = [
    { val: 1200, suffix: '+', label: L({ ar: 'مشارك تمت إدارته', en: 'Participants Managed', fr: 'Participants Gérés', es: 'Participantes Gestionados' }) },
    { val: 99, suffix: '.9%', label: L({ ar: 'دقة المسح', en: 'Scan Accuracy', fr: 'Précision du Scan', es: 'Precisión del Escaneo' }) },
    { val: 0, suffix: '', label: L({ ar: 'ورقة واحدة في الفعالية', en: 'Paper sheets at the event', fr: 'Feuilles de papier à l\'événement', es: 'Hojas de papel en el evento' }) },
  ];

  const team = [
    { role: L({ ar: 'مؤسس / مطور رئيسي', en: 'Founder & Lead Developer', fr: 'Fondateur & Développeur Principal', es: 'Fundador y Desarrollador Principal' }), note: L({ ar: 'بنى المنصة من الصفر', en: 'Built the platform from scratch', fr: 'A construit la plateforme de zéro', es: 'Construyó la plataforma desde cero' }), initials: 'D' },
    { role: L({ ar: 'مدير المنتج', en: 'Product Manager', fr: 'Chef de Produit', es: 'Director de Producto' }), note: L({ ar: 'يعيش في قاعات الفعاليات', en: 'Lives in event venues', fr: 'Vit dans les salles d\'événements', es: 'Vive en los salones de eventos' }), initials: 'E' },
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
            <span className="text-brand-text">{L({ ar: 'من نحن', en: 'About Us', fr: 'À Propos', es: 'Nosotros' })}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(26,138,106,0.15)_0%,transparent_60%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-secondary/5 rounded-full blur-[120px]" />
        <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl mx-auto">
          <motion.div {...fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 rounded-full border border-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-widest mb-8">
            <Sparkles size={14} />
            <span>{L({ ar: 'قصتنا', en: 'Our Story', fr: 'Notre Histoire', es: 'Nuestra Historia' })}</span>
          </motion.div>
          <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black text-brand-text mb-8 leading-tight">
            {L({ ar: 'نبنيها لأن فعالياتكم', en: 'We Build It Because', fr: 'On la Construit Parce Que', es: 'Lo Construimos Porque' })}{' '}
            <span className="text-brand-secondary">{L({ ar: 'تستحق أكثر', en: 'Your Events Deserve More', fr: 'Vos Événements Méritent Plus', es: 'Sus Eventos Merecen Más' })}</span>
          </motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-xl text-brand-muted leading-relaxed max-w-3xl mx-auto">
            {L({
              ar: 'ولدت ديوان من داخل قاعة اجتماع جزائرية، حيث كانت قوائم الورق وأقلام التأشير هي الأدوات الوحيدة لتسجيل 1,200 محضر قضائي. آلينا على أنفسنا أن تكون المرة القادمة مختلفة.',
              en: 'Diwan was born inside an Algerian meeting hall, where paper lists and markers were the only tools to register 1,200 judicial officers. We vowed the next time would be different.',
              fr: 'Diwan est née dans une salle de réunion algérienne, où des listes papier et des marqueurs étaient les seuls outils pour enregistrer 1 200 officiers judiciaires. Nous avons promis que la prochaine fois serait différente.',
              es: 'Diwan nació dentro de una sala de reuniones argelina, donde listas de papel y marcadores eran las únicas herramientas para registrar a 1.200 funcionarios judiciales. Prometimos que la próxima vez sería diferente.',
            })}
          </motion.p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6 max-w-4xl">
          <motion.h2 {...fadeUp} className="text-3xl font-black text-center text-brand-text mb-16">
            {L({ ar: 'رحلتنا', en: 'Our Journey', fr: 'Notre Parcours', es: 'Nuestro Recorrido' })}
          </motion.h2>
          <div className="relative">
            <div className="absolute start-[28px] top-0 bottom-0 w-px bg-gradient-to-b from-brand-primary via-brand-secondary to-transparent" />
            <div className="space-y-12">
              {timeline.map((item, idx) => (
                <motion.div key={idx} {...fadeUp} transition={{ delay: idx * 0.15 }} className="flex items-start gap-8">
                  <div className="w-14 h-14 rounded-full bg-brand-surface border-2 border-brand-secondary flex items-center justify-center text-brand-secondary font-black text-xs shrink-0 relative z-10">
                    {item.year}
                  </div>
                  <div className="flex-1 pb-4 pt-3">
                    <div className="flex items-center gap-2 mb-1 text-brand-secondary text-xs font-bold uppercase tracking-widest">
                      <Calendar size={12} />
                      <span>{item.year}</span>
                    </div>
                    <p className="text-brand-muted text-lg leading-relaxed">{item.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-brand-surface/20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            {stats.map((stat, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1 }} className="text-center">
                <div className="text-4xl md:text-6xl font-black text-brand-secondary mb-3">
                  <Counter to={stat.val} suffix={stat.suffix} />
                </div>
                <div className="text-xs text-brand-muted uppercase tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.h2 {...fadeUp} className="text-3xl md:text-5xl font-black text-center text-brand-text mb-4">
            {L({ ar: 'قيمنا', en: 'Our Values', fr: 'Nos Valeurs', es: 'Nuestros Valores' })}
          </motion.h2>
          <motion.p {...fadeUp} transition={{ delay: 0.1 }} className="text-center text-brand-muted mb-16">
            {L({ ar: 'المبادئ التي توجه كل قرار نتخذه', en: 'The principles guiding every decision we make', fr: 'Les principes guidant chacune de nos décisions', es: 'Los principios que guían cada decisión que tomamos' })}
          </motion.p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {values.map((v, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.15 }} className={`p-8 rounded-[2.5rem] bg-gradient-to-br ${v.color} border border-white/8 glass-card`}>
                <div className="w-14 h-14 bg-brand-dark/50 rounded-2xl flex items-center justify-center text-brand-secondary mb-6">
                  <v.icon size={28} />
                </div>
                <h3 className="text-xl font-black text-brand-text mb-4">{v.title}</h3>
                <p className="text-brand-muted text-sm leading-relaxed">{v.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-brand-surface/10">
        <div className="container mx-auto px-6 max-w-4xl">
          <motion.h2 {...fadeUp} className="text-3xl md:text-5xl font-black text-center text-brand-text mb-4">
            {L({ ar: 'الفريق المؤسس', en: 'The Founding Team', fr: 'L\'Équipe Fondatrice', es: 'El Equipo Fundador' })}
          </motion.h2>
          <motion.p {...fadeUp} transition={{ delay: 0.1 }} className="text-center text-brand-muted mb-16">
            {L({ ar: 'بنوا ديوان لأنهم عاشوا المشكلة', en: 'Built Diwan because they lived the problem', fr: 'Ont construit Diwan car ils ont vécu le problème', es: 'Construyeron Diwan porque vivieron el problema' })}
          </motion.p>
          <div className="grid sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {team.map((member, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.15 }} className="glass-card p-8 rounded-[2rem] border border-white/8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center text-2xl font-black text-white mx-auto mb-6">
                  {member.initials}
                </div>
                <h3 className="font-black text-brand-text text-lg mb-2">{member.role}</h3>
                <p className="text-brand-muted text-sm">{member.note}</p>
                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-brand-muted">
                  <MapPin size={12} />
                  <span>{L({ ar: 'الجزائر', en: 'Algeria', fr: 'Algérie', es: 'Argelia' })}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.08)_0%,transparent_60%)]" />
        <div className="container mx-auto px-6 relative z-10 text-center max-w-2xl mx-auto">
          <motion.h2 {...fadeUp} className="text-3xl md:text-4xl font-black text-brand-text mb-6">
            {L({ ar: 'هل أنت مستعد لتجربة ديوان؟', en: 'Ready to Try Diwan?', fr: 'Prêt à Essayer Diwan ?', es: '¿Listo para Probar Diwan?' })}
          </motion.h2>
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="px-8 py-4 bg-brand-secondary text-brand-dark font-black rounded-full hover:bg-brand-secondary/90 hover:scale-105 transition-all shadow-2xl shadow-brand-secondary/20">
              {L({ ar: 'ابدأ مجاناً', en: 'Start for Free', fr: 'Commencer Gratuitement', es: 'Empezar Gratis' })}
            </Link>
            <Link to="/contact" className="px-8 py-4 border border-white/20 text-brand-text font-bold rounded-full hover:bg-white/5 transition-all flex items-center justify-center gap-2">
              <Users size={18} />
              {L({ ar: 'تحدث مع الفريق', en: 'Talk to the Team', fr: 'Parler à l\'Équipe', es: 'Hablar con el Equipo' })}
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
