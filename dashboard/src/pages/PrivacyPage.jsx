import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Shield, Lock, Eye, Trash2, Mail, Cookie, RefreshCw } from 'lucide-react';
import Header from '../components/LandingPage/Header';
import Footer from '../components/LandingPage/Footer';
import { useLang } from '../utils/useLang';
import '../styles/landing.css';

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

const Section = ({ icon: Icon, title, children }) => (
  <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mb-12">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 bg-brand-primary/20 rounded-xl flex items-center justify-center text-brand-secondary shrink-0">
        <Icon size={16} />
      </div>
      <h2 className="text-xl font-black text-brand-secondary">{title}</h2>
    </div>
    <div className="text-brand-muted leading-relaxed space-y-3 ps-11">{children}</div>
  </motion.div>
);

const PrivacyPage = () => {
  const { L, isRtl } = useLang();

  useEffect(() => {
    document.title = `${L({ ar: 'سياسة الخصوصية', en: 'Privacy Policy', fr: 'Politique de Confidentialité', es: 'Política de Privacidad' })} | Diwan Event`;
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-brand-dark text-brand-text font-sans noise-bg" dir={isRtl ? 'rtl' : 'ltr'}>
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-white/5 py-4 pt-24">
        <div className="container mx-auto px-6">
          <nav className="flex items-center gap-2 text-xs text-brand-muted">
            <Link to="/" className="hover:text-brand-secondary transition-colors">{L({ ar: 'الرئيسية', en: 'Home', fr: 'Accueil', es: 'Inicio' })}</Link>
            <ChevronRight size={12} className={isRtl ? 'rotate-180' : ''} />
            <span className="text-brand-text">{L({ ar: 'سياسة الخصوصية', en: 'Privacy Policy', fr: 'Confidentialité', es: 'Privacidad' })}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl mx-auto">
          <motion.div {...fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 rounded-full border border-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-widest mb-6">
            <Shield size={14} />
            <span>{L({ ar: 'حماية بياناتك أولويتنا', en: 'Your Data Protection is Our Priority', fr: 'Votre Confidentialité est Notre Priorité', es: 'Su Privacidad es Nuestra Prioridad' })}</span>
          </motion.div>
          <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black text-brand-text mb-6">
            {L({ ar: 'سياسة', en: 'Privacy', fr: 'Politique de', es: 'Política de' })}{' '}
            <span className="text-brand-secondary">{L({ ar: 'الخصوصية', en: 'Policy', fr: 'Confidentialité', es: 'Privacidad' })}</span>
          </motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-brand-muted">
            {L({ ar: 'آخر تحديث: مايو 2026', en: 'Last updated: May 2026', fr: 'Dernière mise à jour : Mai 2026', es: 'Última actualización: Mayo 2026' })}
          </motion.p>
        </div>
      </div>

      {/* Content */}
      <main className="relative z-10 pb-24">
        <div className="container mx-auto px-6 max-w-3xl">

          <Section icon={Shield} title={L({ ar: '١. مقدمة', en: '1. Introduction', fr: '1. Introduction', es: '1. Introducción' })}>
            <p>{L({
              ar: 'نحن في Diwan Event Platform نأخذ خصوصيتك بجدية تامة. تشرح هذه السياسة كيف نجمع بياناتك ونستخدمها ونحميها عند استخدامك لمنصتنا.',
              en: 'At Diwan Event Platform, we take your privacy very seriously. This policy explains how we collect, use, and protect your data when you use our platform.',
              fr: 'Chez Diwan Event Platform, nous prenons votre vie privée très au sérieux. Cette politique explique comment nous collectons, utilisons et protégeons vos données.',
              es: 'En Diwan Event Platform, tomamos su privacidad muy en serio. Esta política explica cómo recopilamos, usamos y protegemos sus datos.',
            })}</p>
          </Section>

          <Section icon={Eye} title={L({ ar: '٢. البيانات التي نجمعها', en: '2. Data We Collect', fr: '2. Données Collectées', es: '2. Datos que Recopilamos' })}>
            <ul className="space-y-2 list-disc list-inside">
              <li>{L({ ar: 'معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف', en: 'Account information: name, email, phone number', fr: 'Informations de compte : nom, email, téléphone', es: 'Información de cuenta: nombre, email, teléfono' })}</li>
              <li>{L({ ar: 'بيانات الفعاليات: قوائم المشاركين، سجلات الحضور', en: 'Event data: participant lists, attendance records', fr: 'Données événements : listes de participants, registres de présence', es: 'Datos de eventos: listas de participantes, registros de asistencia' })}</li>
              <li>{L({ ar: 'بيانات الاستخدام: سجلات الدخول، نشاط المنصة', en: 'Usage data: login logs, platform activity', fr: 'Données d\'utilisation : journaux de connexion, activité de la plateforme', es: 'Datos de uso: registros de acceso, actividad de la plataforma' })}</li>
              <li className="text-brand-secondary">{L({ ar: 'لا نجمع: بيانات بيومترية أو موقع جغرافي دقيق', en: 'We do NOT collect: biometric data or precise geolocation', fr: 'Nous ne collectons PAS : données biométriques ni géolocalisation précise', es: 'NO recopilamos: datos biométricos ni geolocalización precisa' })}</li>
            </ul>
          </Section>

          <Section icon={RefreshCw} title={L({ ar: '٣. كيف نستخدم بياناتك', en: '3. How We Use Your Data', fr: '3. Utilisation de Vos Données', es: '3. Cómo Usamos Sus Datos' })}>
            <ul className="space-y-2 list-disc list-inside">
              <li>{L({ ar: 'تشغيل خدمة إدارة الفعاليات', en: 'Operating the event management service', fr: 'Exploitation du service de gestion d\'événements', es: 'Operación del servicio de gestión de eventos' })}</li>
              <li>{L({ ar: 'إرسال إشعارات التسجيل والشهادات', en: 'Sending registration and certificate notifications', fr: 'Envoi des notifications d\'inscription et de certificats', es: 'Envío de notificaciones de registro y certificados' })}</li>
              <li>{L({ ar: 'تحسين أداء المنصة', en: 'Improving platform performance', fr: 'Amélioration des performances de la plateforme', es: 'Mejora del rendimiento de la plataforma' })}</li>
              <li className="text-brand-secondary font-bold">{L({ ar: 'لا نبيع بياناتك لأطراف ثالثة أبداً', en: 'We NEVER sell your data to third parties', fr: 'Nous ne vendons JAMAIS vos données à des tiers', es: 'NUNCA vendemos sus datos a terceros' })}</li>
            </ul>
          </Section>

          <Section icon={Lock} title={L({ ar: '٤. حماية البيانات', en: '4. Data Protection', fr: '4. Protection des Données', es: '4. Protección de Datos' })}>
            <ul className="space-y-2 list-disc list-inside">
              <li>{L({ ar: 'تشفير AES-256 للمحادثات الخاصة', en: 'AES-256 encryption for private data', fr: 'Chiffrement AES-256 pour les données privées', es: 'Cifrado AES-256 para datos privados' })}</li>
              <li>{L({ ar: 'HTTPS لكل الاتصالات', en: 'HTTPS for all communications', fr: 'HTTPS pour toutes les communications', es: 'HTTPS para todas las comunicaciones' })}</li>
              <li>{L({ ar: 'قواعد بيانات معزولة لكل فعالية', en: 'Isolated databases per event', fr: 'Bases de données isolées par événement', es: 'Bases de datos aisladas por evento' })}</li>
              <li>{L({ ar: 'نسخ احتياطية مشفرة يومياً', en: 'Daily encrypted backups', fr: 'Sauvegardes chiffrées quotidiennes', es: 'Copias de seguridad cifradas diariamente' })}</li>
            </ul>
          </Section>

          <Section icon={Trash2} title={L({ ar: '٥. حقوقك', en: '5. Your Rights', fr: '5. Vos Droits', es: '5. Sus Derechos' })}>
            <ul className="space-y-2 list-disc list-inside">
              <li>{L({ ar: 'طلب نسخة من بياناتك', en: 'Request a copy of your data', fr: 'Demander une copie de vos données', es: 'Solicitar una copia de sus datos' })}</li>
              <li>{L({ ar: 'طلب حذف بياناتك', en: 'Request deletion of your data', fr: 'Demander la suppression de vos données', es: 'Solicitar la eliminación de sus datos' })}</li>
              <li>{L({ ar: 'الاعتراض على معالجة معينة', en: 'Object to specific processing', fr: 'S\'opposer à certains traitements', es: 'Oponerse a ciertos procesamientos' })}</li>
            </ul>
            <div className="mt-4 p-4 bg-brand-surface/50 rounded-xl border border-white/5">
              <p className="flex items-center gap-2"><Mail size={14} className="text-brand-primary" />
                <span>{L({ ar: 'للاستفسار:', en: 'For inquiries:', fr: 'Pour toute demande :', es: 'Para consultas:' })}</span>
                <a href="mailto:privacy@e-diwan.net" className="text-brand-secondary hover:underline">privacy@e-diwan.net</a>
              </p>
            </div>
          </Section>

          <Section icon={Cookie} title={L({ ar: '٦. ملفات تعريف الارتباط', en: '6. Cookies', fr: '6. Cookies', es: '6. Cookies' })}>
            <p>{L({
              ar: 'نستخدم Cookies ضرورية للعمل فقط. لا إعلانات، لا تتبع خارجي.',
              en: 'We use only essential cookies. No ads, no external tracking.',
              fr: 'Nous n\'utilisons que les cookies essentiels au fonctionnement. Pas de publicités, pas de tracking externe.',
              es: 'Solo utilizamos cookies esenciales. Sin publicidad, sin rastreo externo.',
            })}</p>
          </Section>

          <Section icon={RefreshCw} title={L({ ar: '٧. التحديثات', en: '7. Updates', fr: '7. Mises à Jour', es: '7. Actualizaciones' })}>
            <p>{L({
              ar: 'سنُخطرك بأي تغيير جوهري في هذه السياسة عبر البريد الإلكتروني. آخر تحديث: مايو 2026.',
              en: 'We will notify you of any material changes to this policy via email. Last updated: May 2026.',
              fr: 'Nous vous informerons de toute modification importante par email. Dernière mise à jour : Mai 2026.',
              es: 'Le notificaremos cualquier cambio material en esta política por email. Última actualización: Mayo 2026.',
            })}</p>
          </Section>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPage;
