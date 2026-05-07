import React from 'react';
import { FileText, Download, Mail, FileBarChart, CloudOff, Globe, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLang } from '../../utils/useLang';

const AdditionalFeatures = () => {
  const { L, isRtl } = useLang();

  const extraFeatures = [
    {
      icon: FileText,
      title: L({ ar: "شهادات تلقائية", en: "Auto Certificates", fr: "Certificats Auto", es: "Certificados Auto" }),
      desc: L({
        ar: "توليد وإرسال شهادات الحضور فور انتهاء الفعالية.",
        en: "Generate and send certificates instantly after the event.",
        fr: "Générez et envoyez des certificats dès la fin de l'événement.",
        es: "Genere y envíe certificados al instante tras el evento."
      })
    },
    {
      icon: Download,
      title: L({ ar: "تصدير Excel", en: "Excel Export", fr: "Export Excel", es: "Exportar Excel" }),
      desc: L({
        ar: "سحب كافة بيانات الحضور بضغطة واحدة وبدقة كاملة.",
        en: "Export all attendance data in one click with full accuracy.",
        fr: "Exportez toutes les données en un clic avec une précision totale.",
        es: "Exporte todos los datos de asistencia con un clic y precisión total."
      })
    },
    {
      icon: Mail,
      title: L({ ar: "بريد تلقائي", en: "Auto Email", fr: "Email Automatique", es: "Email Automático" }),
      desc: L({
        ar: "تنبيهات ورسائل ترحيب أوتوماتيكية للمشاركين.",
        en: "Automatic alerts and welcome messages for participants.",
        fr: "Alertes et messages de bienvenue automatiques pour les participants.",
        es: "Alertas y mensajes de bienvenida automáticos para asistentes."
      })
    },
    {
      icon: FileBarChart,
      title: L({ ar: "تقارير PDF", en: "PDF Reports", fr: "Rapports PDF", es: "Informes PDF" }),
      desc: L({
        ar: "محاضر إثبات حضور رسمية جاهزة للطباعة.",
        en: "Official attendance proof reports ready for printing.",
        fr: "Preuves de présence officielles prêtes à l'impression.",
        es: "Informes oficiales de asistencia listos para imprimir."
      })
    },
    {
      icon: CloudOff,
      title: L({ ar: "وضع Offline", en: "Offline Mode", fr: "Mode Hors Ligne", es: "Modo Offline" }),
      desc: L({
        ar: "استمرار المسح حتى في حال انقطاع الإنترنت.",
        en: "Continue scanning even if the internet is disconnected.",
        fr: "Continuez le scan même sans connexion internet.",
        es: "Continúe escaneando incluso sin conexión a internet."
      })
    },
    {
      icon: Globe,
      title: L({ ar: "دعم لغوي شامل", en: "Full Multi-lang", fr: "Support Multilingue", es: "Soporte Multilingüe" }),
      desc: L({
        ar: "واجهة وتصميم متوافق تماماً مع المؤسسات العالمية.",
        en: "Interface and design fully compatible with global institutions.",
        fr: "Interface et design compatibles avec les institutions mondiales.",
        es: "Interfaz y diseño compatibles con instituciones globales."
      })
    }
  ];

  return (
    <section className="py-24 bg-brand-dark relative overflow-hidden" id="additional-features">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
          <div className={isRtl ? "text-right" : "text-left"}>
            <h2 className="text-3xl md:text-5xl font-black text-brand-text mb-4">
              {L({ ar: "أكثر من مجرد ماسح QR", en: "More Than Just a QR Scanner", fr: "Plus qu'un Simple Scanner QR", es: "Más que un Simple Escáner QR" })}
            </h2>
            <p className="text-brand-muted">
              {L({
                ar: "حزمة متكاملة من الأدوات التي تجعل التنظيم متعة لا عبئاً.",
                en: "A complete suite of tools that makes organizing a pleasure, not a burden.",
                fr: "Une suite complète d'outils pour une organisation fluide.",
                es: "Un conjunto completo de herramientas para una organización fluida."
              })}
            </p>
          </div>
          <div className="flex -space-x-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-12 h-12 rounded-full border-4 border-brand-dark bg-brand-primary/10 flex items-center justify-center">
                <Check size={20} className="text-brand-primary" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {extraFeatures.map((feat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02, y: -5 }}
              className="p-6 glass-card rounded-2xl border border-brand-border hover:border-brand-secondary/40 transition-all flex items-start gap-5"
            >
              <div className="w-12 h-12 bg-brand-primary/10 rounded-xl shadow-sm flex items-center justify-center text-brand-primary flex-shrink-0">
                <feat.icon size={24} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <h3 className="font-bold text-brand-text mb-1">{feat.title}</h3>
                <p className="text-xs text-brand-muted leading-relaxed">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdditionalFeatures;
