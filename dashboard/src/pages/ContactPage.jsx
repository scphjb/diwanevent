import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Mail, MapPin, Globe, Clock, CheckCircle2, MessageSquare } from 'lucide-react';
import Header from '../components/LandingPage/Header';
import Footer from '../components/LandingPage/Footer';
import { useLang } from '../utils/useLang';
import '../styles/landing.css';

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

const INQUIRY_TYPES = (L) => [
  { value: 'general',  label: L({ ar: 'استفسار عام', en: 'General Inquiry', fr: 'Demande Générale', es: 'Consulta General' }) },
  { value: 'sales',    label: L({ ar: 'طلب عرض أسعار', en: 'Sales / Pricing', fr: 'Ventes / Tarifs', es: 'Ventas / Precios' }) },
  { value: 'support',  label: L({ ar: 'دعم تقني', en: 'Technical Support', fr: 'Support Technique', es: 'Soporte Técnico' }) },
  { value: 'demo',     label: L({ ar: 'طلب عرض تجريبي', en: 'Request a Demo', fr: 'Demander une Démo', es: 'Solicitar Demo' }) },
  { value: 'press',    label: L({ ar: 'إعلام وصحافة', en: 'Press & Media', fr: 'Presse & Médias', es: 'Prensa y Medios' }) },
];

const ContactPage = () => {
  const { L, isRtl } = useLang();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', type: 'general' });
  const [submitted, setSubmitted] = useState(false);
  const inquiryTypes = INQUIRY_TYPES(L);

  useEffect(() => {
    document.title = `${L({ ar: 'اتصل بنا', en: 'Contact Us', fr: 'Contactez-nous', es: 'Contáctenos' })} | Diwan Event`;
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(form.subject || `[${form.type}] Diwan Inquiry`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\nType: ${form.type}\n\n${form.message}`);
    window.location.href = `mailto:hello@e-diwan.net?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  const inputCls = "w-full bg-brand-surface/40 border border-white/10 rounded-2xl px-5 py-4 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-secondary transition-all text-sm";

  return (
    <div className="min-h-screen bg-brand-dark text-brand-text font-sans noise-bg" dir={isRtl ? 'rtl' : 'ltr'}>
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-white/5 py-4 pt-24">
        <div className="container mx-auto px-6">
          <nav className="flex items-center gap-2 text-xs text-brand-muted">
            <Link to="/" className="hover:text-brand-secondary transition-colors">{L({ ar: 'الرئيسية', en: 'Home', fr: 'Accueil', es: 'Inicio' })}</Link>
            <ChevronRight size={12} className={isRtl ? 'rotate-180' : ''} />
            <span className="text-brand-text">{L({ ar: 'اتصل بنا', en: 'Contact Us', fr: 'Contactez-nous', es: 'Contáctenos' })}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(26,138,106,0.1)_0%,transparent_60%)]" />
        <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl mx-auto">
          <motion.div {...fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 rounded-full border border-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-widest mb-6">
            <MessageSquare size={14} />
            <span>{L({ ar: 'نرد خلال 24 ساعة', en: 'We reply within 24 hours', fr: 'Nous répondons sous 24 heures', es: 'Respondemos en 24 horas' })}</span>
          </motion.div>
          <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black text-brand-text mb-4">
            {L({ ar: 'نحن هنا', en: 'We Are', fr: 'Nous Sommes', es: 'Estamos' })}{' '}
            <span className="text-brand-secondary">{L({ ar: 'للمساعدة', en: 'Here to Help', fr: 'Là pour Vous Aider', es: 'Aquí para Ayudar' })}</span>
          </motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-brand-muted text-lg">
            {L({ ar: 'سواء كان لديك سؤال أو طلب عرض أو مجرد فضول — تواصل معنا.', en: 'Whether you have a question, pricing request, or are just curious — reach out.', fr: 'Que vous ayez une question, une demande de tarif ou soyez simplement curieux — contactez-nous.', es: 'Ya sea que tenga una pregunta, solicitud de precios o simplemente curiosidad — contáctenos.' })}
          </motion.p>
        </div>
      </div>

      {/* Main Grid */}
      <main className="relative z-10 pb-24">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 max-w-5xl mx-auto items-start">

            {/* Form */}
            <motion.div {...fadeUp}>
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-[2.5rem] p-12 text-center border border-brand-primary/20"
                  >
                    <div className="w-20 h-20 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary">
                      <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-brand-text mb-3">
                      {L({ ar: 'تم الإرسال!', en: 'Message Sent!', fr: 'Message Envoyé !', es: '¡Mensaje Enviado!' })}
                    </h2>
                    <p className="text-brand-muted mb-8">
                      {L({ ar: 'فتح تطبيق البريد الإلكتروني تلقائياً. سنرد خلال 24 ساعة.', en: 'Your email client opened automatically. We\'ll reply within 24 hours.', fr: 'Votre client email s\'est ouvert automatiquement. Nous répondrons sous 24 heures.', es: 'Su cliente de email se abrió automáticamente. Responderemos en 24 horas.' })}
                    </p>
                    <button onClick={() => setSubmitted(false)} className="text-brand-secondary font-bold text-sm hover:underline">
                      {L({ ar: 'إرسال رسالة أخرى', en: 'Send another message', fr: 'Envoyer un autre message', es: 'Enviar otro mensaje' })}
                    </button>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={handleSubmit} className="glass-card rounded-[2.5rem] p-10 border border-white/8 space-y-5">
                    <h2 className="text-2xl font-black text-brand-text mb-6">
                      {L({ ar: 'أرسل رسالتك', en: 'Send a Message', fr: 'Envoyer un Message', es: 'Enviar un Mensaje' })}
                    </h2>

                    {/* Inquiry Type */}
                    <div className="grid grid-cols-2 gap-2">
                      {inquiryTypes.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, type: type.value }))}
                          className={`p-3 rounded-xl text-xs font-bold text-start transition-all border ${form.type === type.value ? 'border-brand-secondary bg-brand-secondary/10 text-brand-secondary' : 'border-white/8 text-brand-muted hover:border-white/20'}`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>

                    <input required name="name" value={form.name} onChange={handleChange} placeholder={L({ ar: 'اسمك الكامل', en: 'Full Name', fr: 'Nom complet', es: 'Nombre completo' })} className={inputCls} />
                    <input required type="email" name="email" value={form.email} onChange={handleChange} placeholder={L({ ar: 'بريدك الإلكتروني', en: 'Your Email', fr: 'Votre Email', es: 'Su Email' })} className={inputCls} />
                    <input required name="subject" value={form.subject} onChange={handleChange} placeholder={L({ ar: 'موضوع الرسالة', en: 'Subject', fr: 'Objet', es: 'Asunto' })} className={inputCls} />
                    <textarea required name="message" value={form.message} onChange={handleChange} rows={5} placeholder={L({ ar: 'رسالتك...', en: 'Your message...', fr: 'Votre message...', es: 'Su mensaje...' })} className={`${inputCls} resize-none`} />

                    <button type="submit" className="w-full py-4 bg-brand-secondary text-brand-dark font-black rounded-2xl hover:bg-brand-secondary/90 hover:scale-[1.02] transition-all shadow-xl shadow-brand-secondary/20">
                      {L({ ar: 'إرسال الرسالة', en: 'Send Message', fr: 'Envoyer', es: 'Enviar Mensaje' })}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Info Cards */}
            <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="space-y-6">
              {[
                {
                  icon: Mail,
                  title: L({ ar: 'البريد الإلكتروني', en: 'Email', fr: 'Email', es: 'Email' }),
                  val: 'hello@e-diwan.net',
                  note: L({ ar: 'للاستفسارات العامة', en: 'For general inquiries', fr: 'Pour les demandes générales', es: 'Para consultas generales' }),
                  href: 'mailto:hello@e-diwan.net',
                },
                {
                  icon: Clock,
                  title: L({ ar: 'وقت الاستجابة', en: 'Response Time', fr: 'Délai de Réponse', es: 'Tiempo de Respuesta' }),
                  val: L({ ar: 'خلال 24 ساعة', en: 'Within 24 hours', fr: 'Sous 24 heures', es: 'En 24 horas' }),
                  note: L({ ar: 'أيام العمل — الأحد إلى الخميس', en: 'Business days — Sun to Thu', fr: 'Jours ouvrés — Dim à Jeu', es: 'Días hábiles — Dom a Jue' }),
                  href: null,
                },
                {
                  icon: MapPin,
                  title: L({ ar: 'موقعنا', en: 'Location', fr: 'Localisation', es: 'Ubicación' }),
                  val: L({ ar: 'الجزائر العاصمة، الجزائر', en: 'Algiers, Algeria', fr: 'Alger, Algérie', es: 'Argel, Argelia' }),
                  note: L({ ar: 'خدمة رقمية — متاحون عبر الإنترنت', en: 'Digital service — available online', fr: 'Service numérique — disponible en ligne', es: 'Servicio digital — disponible en línea' }),
                  href: null,
                },
                {
                  icon: Globe,
                  title: L({ ar: 'اللغات المدعومة', en: 'Supported Languages', fr: 'Langues Supportées', es: 'Idiomas Soportados' }),
                  val: L({ ar: 'العربية، الفرنسية، الإنجليزية، الإسبانية', en: 'Arabic, French, English, Spanish', fr: 'Arabe, Français, Anglais, Espagnol', es: 'Árabe, Francés, Inglés, Español' }),
                  note: L({ ar: 'دعم متعدد اللغات بالكامل', en: 'Full multilingual support', fr: 'Support multilingue complet', es: 'Soporte multilingüe completo' }),
                  href: null,
                },
              ].map((card, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 rounded-2xl border border-white/8 flex items-start gap-5">
                  <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-secondary shrink-0">
                    <card.icon size={22} />
                  </div>
                  <div>
                    <div className="text-xs text-brand-muted uppercase tracking-widest mb-1">{card.title}</div>
                    {card.href
                      ? <a href={card.href} className="font-bold text-brand-text hover:text-brand-secondary transition-colors">{card.val}</a>
                      : <div className="font-bold text-brand-text">{card.val}</div>
                    }
                    <div className="text-xs text-brand-muted mt-1">{card.note}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;
