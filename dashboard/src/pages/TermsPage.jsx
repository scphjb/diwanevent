import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, FileText, User, Ban, CreditCard, Copyright, AlertTriangle, Scale } from 'lucide-react';
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

const TermsPage = () => {
  const { L, isRtl } = useLang();

  useEffect(() => {
    document.title = `${L({ ar: 'شروط الاستخدام', en: 'Terms of Service', fr: 'Conditions d\'Utilisation', es: 'Términos de Servicio' })} | Diwan Event`;
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
            <span className="text-brand-text">{L({ ar: 'شروط الاستخدام', en: 'Terms of Service', fr: 'Conditions', es: 'Términos' })}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="py-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-secondary/5 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl mx-auto">
          <motion.div {...fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-secondary/10 rounded-full border border-brand-secondary/20 text-brand-secondary text-xs font-bold uppercase tracking-widest mb-6">
            <FileText size={14} />
            <span>{L({ ar: 'اتفاقية واضحة وشفافة', en: 'Clear & Transparent Agreement', fr: 'Accord Clair et Transparent', es: 'Acuerdo Claro y Transparente' })}</span>
          </motion.div>
          <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black text-brand-text mb-6">
            {L({ ar: 'شروط', en: 'Terms of', fr: 'Conditions d\'', es: 'Términos de' })}{' '}
            <span className="text-brand-secondary">{L({ ar: 'الاستخدام', en: 'Service', fr: 'Utilisation', es: 'Servicio' })}</span>
          </motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-brand-muted">
            {L({ ar: 'آخر تحديث: مايو 2026', en: 'Last updated: May 2026', fr: 'Dernière mise à jour : Mai 2026', es: 'Última actualización: Mayo 2026' })}
          </motion.p>
        </div>
      </div>

      {/* Content */}
      <main className="relative z-10 pb-24">
        <div className="container mx-auto px-6 max-w-3xl">

          <Section icon={FileText} title={L({ ar: '١. قبول الشروط', en: '1. Acceptance of Terms', fr: '1. Acceptation des Conditions', es: '1. Aceptación de Términos' })}>
            <p>{L({
              ar: 'باستخدام منصة Diwan Event، فأنت توافق على هذه الشروط. إذا كنت تمثل منظمة، فأنت مخول قانونياً للموافقة باسمها.',
              en: 'By using Diwan Event Platform, you agree to these terms. If representing an organization, you are legally authorized to agree on its behalf.',
              fr: 'En utilisant Diwan Event Platform, vous acceptez ces conditions. Si vous représentez une organisation, vous êtes légalement autorisé à accepter en son nom.',
              es: 'Al usar Diwan Event Platform, acepta estos términos. Si representa una organización, está legalmente autorizado para aceptar en su nombre.',
            })}</p>
          </Section>

          <Section icon={FileText} title={L({ ar: '٢. الخدمة المقدمة', en: '2. Services Provided', fr: '2. Services Fournis', es: '2. Servicios Provistos' })}>
            <p className="mb-2">{L({ ar: 'Diwan Event توفر:', en: 'Diwan Event provides:', fr: 'Diwan Event fournit :', es: 'Diwan Event proporciona:' })}</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>{L({ ar: 'نظام إدارة تسجيل المشاركين في الفعاليات', en: 'Event participant registration management', fr: 'Gestion des inscriptions aux événements', es: 'Gestión de registro de participantes en eventos' })}</li>
              <li>{L({ ar: 'خدمة تسجيل الحضور عبر QR', en: 'QR-based attendance tracking', fr: 'Suivi de présence par QR', es: 'Seguimiento de asistencia por QR' })}</li>
              <li>{L({ ar: 'أدوات التواصل المهني بين المشاركين', en: 'Professional networking tools', fr: 'Outils de réseautage professionnel', es: 'Herramientas de networking profesional' })}</li>
              <li>{L({ ar: 'توليد الشهادات والشارات', en: 'Certificate and badge generation', fr: 'Génération de certificats et badges', es: 'Generación de certificados y acreditaciones' })}</li>
            </ul>
          </Section>

          <Section icon={User} title={L({ ar: '٣. حسابك ومسؤوليتك', en: '3. Your Account & Responsibility', fr: '3. Votre Compte et Responsabilité', es: '3. Su Cuenta y Responsabilidad' })}>
            <ul className="space-y-2 list-disc list-inside">
              <li>{L({ ar: 'أنت مسؤول عن الحفاظ على سرية كلمة المرور', en: 'You are responsible for maintaining password confidentiality', fr: 'Vous êtes responsable de la confidentialité de votre mot de passe', es: 'Es responsable de mantener la confidencialidad de su contraseña' })}</li>
              <li>{L({ ar: 'لا تشارك حسابك مع آخرين', en: 'Do not share your account with others', fr: 'Ne partagez pas votre compte avec d\'autres personnes', es: 'No comparta su cuenta con otros' })}</li>
              <li>{L({ ar: 'أنت مسؤول عن دقة بيانات المشاركين التي ترفعها', en: 'You are responsible for the accuracy of participant data you upload', fr: 'Vous êtes responsable de l\'exactitude des données des participants', es: 'Es responsable de la exactitud de los datos de participantes que sube' })}</li>
            </ul>
          </Section>

          <Section icon={Ban} title={L({ ar: '٤. الاستخدام المقبول', en: '4. Acceptable Use', fr: '4. Utilisation Acceptable', es: '4. Uso Aceptable' })}>
            <p className="mb-2 text-red-400">{L({ ar: 'يُحظر استخدام المنصة لـ:', en: 'Platform use is prohibited for:', fr: 'L\'utilisation de la plateforme est interdite pour :', es: 'El uso de la plataforma está prohibido para:' })}</p>
            <ul className="space-y-2 list-disc list-inside text-red-400/80">
              <li>{L({ ar: 'رفع بيانات مزيفة أو مضللة', en: 'Uploading false or misleading data', fr: 'Le téléchargement de données fausses ou trompeuses', es: 'Subir datos falsos o engañosos' })}</li>
              <li>{L({ ar: 'محاولة اختراق المنصة أو التلاعب بها', en: 'Attempting to hack or manipulate the platform', fr: 'Tenter de pirater ou manipuler la plateforme', es: 'Intentar hackear o manipular la plataforma' })}</li>
              <li>{L({ ar: 'إرسال مراسلات غير مرغوب بها للمشاركين', en: 'Sending unsolicited communications to participants', fr: 'Envoyer des communications non sollicitées aux participants', es: 'Enviar comunicaciones no solicitadas a los participantes' })}</li>
            </ul>
          </Section>

          <Section icon={CreditCard} title={L({ ar: '٥. الخطط والدفع', en: '5. Plans & Payment', fr: '5. Forfaits et Paiement', es: '5. Planes y Pago' })}>
            <ul className="space-y-2 list-disc list-inside">
              <li>{L({ ar: 'الخطة المجانية: 200 مشارك/فعالية', en: 'Free Plan: 200 participants/event', fr: 'Forfait Gratuit : 200 participants/événement', es: 'Plan Gratuito: 200 participantes/evento' })}</li>
              <li>{L({ ar: 'الدفع مقدماً غير قابل للاسترداد بعد 7 أيام', en: 'Prepayment is non-refundable after 7 days', fr: 'Le prépaiement n\'est pas remboursable après 7 jours', es: 'El pago anticipado no es reembolsable después de 7 días' })}</li>
              <li>{L({ ar: 'يمكن إلغاء الاشتراك في أي وقت', en: 'Subscription can be cancelled at any time', fr: 'L\'abonnement peut être annulé à tout moment', es: 'La suscripción puede cancelarse en cualquier momento' })}</li>
            </ul>
          </Section>

          <Section icon={Copyright} title={L({ ar: '٦. الملكية الفكرية', en: '6. Intellectual Property', fr: '6. Propriété Intellectuelle', es: '6. Propiedad Intelectual' })}>
            <ul className="space-y-2 list-disc list-inside">
              <li>{L({ ar: 'كود المنصة وتصميمها ملك Diwan Event', en: 'Platform code and design belong to Diwan Event', fr: 'Le code et le design de la plateforme appartiennent à Diwan Event', es: 'El código y diseño de la plataforma pertenecen a Diwan Event' })}</li>
              <li className="text-brand-secondary">{L({ ar: 'بياناتك وبيانات مشاركيك ملكك أنت', en: 'Your data and participant data belong to you', fr: 'Vos données et les données de vos participants vous appartiennent', es: 'Sus datos y los datos de sus participantes le pertenecen a usted' })}</li>
            </ul>
          </Section>

          <Section icon={AlertTriangle} title={L({ ar: '٧. حدود المسؤولية', en: '7. Limitation of Liability', fr: '7. Limitation de Responsabilité', es: '7. Limitación de Responsabilidad' })}>
            <p>{L({ ar: 'لا نتحمل المسؤولية عن:', en: 'We are not liable for:', fr: 'Nous ne sommes pas responsables de :', es: 'No somos responsables de:' })}</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>{L({ ar: 'انقطاع الخدمة لأسباب خارجة عن إرادتنا', en: 'Service interruptions beyond our control', fr: 'Interruptions de service hors de notre contrôle', es: 'Interrupciones del servicio fuera de nuestro control' })}</li>
              <li>{L({ ar: 'الأضرار غير المباشرة الناتجة عن استخدام المنصة', en: 'Indirect damages resulting from platform use', fr: 'Dommages indirects résultant de l\'utilisation de la plateforme', es: 'Daños indirectos resultantes del uso de la plataforma' })}</li>
            </ul>
          </Section>

          <Section icon={Scale} title={L({ ar: '٨. القانون المنظم', en: '8. Governing Law', fr: '8. Droit Applicable', es: '8. Ley Aplicable' })}>
            <p>{L({
              ar: 'تخضع هذه الاتفاقية للقانون الجزائري. أي نزاع يُحل أمام المحاكم الجزائرية المختصة. آخر تحديث: مايو 2026.',
              en: 'This agreement is governed by Algerian law. Any dispute shall be resolved before the competent Algerian courts. Last updated: May 2026.',
              fr: 'Cet accord est régi par le droit algérien. Tout litige sera résolu devant les tribunaux algériens compétents. Dernière mise à jour : Mai 2026.',
              es: 'Este acuerdo se rige por la ley argelina. Cualquier disputa se resolverá ante los tribunales argelinos competentes. Última actualización: Mayo 2026.',
            })}</p>
          </Section>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsPage;
