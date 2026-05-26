import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Scan, Monitor, UserCheck, ShieldCheck } from 'lucide-react';
import { useLang } from '../../utils/useLang';

const AccessFlexibility = () => {
  const { L, i18n } = useLang();

  const methods = [
    {
      title: L({ ar: "موبايل QR", en: "Mobile QR", fr: "QR Mobile", es: "QR Móvil" }),
      desc: L({ ar: "استخدم أي هاتف ذكي كجهاز مسح عبر تطبيق المنظمين.", en: "Use any smartphone as a scanner via the organizer app.", fr: "Utilisez tout smartphone comme scanner via l'app organisateur.", es: "Use cualquier smartphone como escáner con la app del organizador." }),
      accuracy: "99.9%",
      icon: Smartphone,
      color: "from-blue-500/20 to-cyan-500/20"
    },
    {
      title: L({ ar: "ماسح USB", en: "USB Scanner", fr: "Scanner USB", es: "Escáner USB" }),
      desc: L({ ar: "تكامل مباشر مع الماسحات الضوئية اللاسلكية للسرعة القصوى.", en: "Direct integration with wireless scanners for maximum speed.", fr: "Intégration directe avec les scanners sans fil pour une vitesse maximale.", es: "Integración directa con escáneres inalámbricos para máxima velocidad." }),
      accuracy: "100%",
      icon: Scan,
      color: "from-brand-primary/20 to-teal-500/20"
    },
    {
      title: L({ ar: "خدمة ذاتية", en: "Self-service Kiosk", fr: "Borne Libre-service", es: "Quiosco Autoservicio" }),
      desc: L({ ar: "محطات تسجيل حضور ذاتي للمشاركين لتقليل الازدحام.", en: "Self-service check-in stations to reduce congestion.", fr: "Bornes d'enregistrement en libre-service pour réduire les files d'attente.", es: "Estaciones de auto-registro para reducir la congestión." }),
      accuracy: "99.5%",
      icon: Monitor,
      color: "from-brand-secondary/20 to-orange-500/20"
    },
    {
      title: L({ ar: "تحقق يدوي", en: "Admin Manual", fr: "Vérification Manuelle", es: "Verificación Manual" }),
      desc: L({ ar: "إمكانية التحقق اليدوي بالاسم أو رقم الهاتف للحالات الاستثنائية.", en: "Manual verification by name or phone for exceptions.", fr: "Vérification manuelle par nom ou téléphone pour les cas exceptionnels.", es: "Verificación manual por nombre o teléfono para casos excepcionales." }),
      accuracy: L({ ar: "100% (بشري)", en: "100% (Manual)", fr: "100% (Humain)", es: "100% (Manual)" }),
      icon: UserCheck,
      color: "from-purple-500/20 to-pink-500/20"
    }
  ];

  return (
    <section id="hardware" className="py-24 bg-brand-dark relative overflow-hidden" dir={i18n.dir()}>
      {/* Background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(26,138,106,0.05)_0%,transparent_70%)]" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 rounded-full border border-brand-primary/20 text-brand-primary text-sm font-bold mb-6 uppercase tracking-wider"
          >
            <ShieldCheck size={16} />
            <span>{L({ ar: 'اعتمادية مطلقة', en: 'ABSOLUTE RELIABILITY', fr: 'FIABILITÉ ABSOLUE', es: 'FIABILIDAD ABSOLUTA' })}</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-black text-brand-text mb-6"
          >
            {L({ ar: "مرونة كاملة في الوصول", en: "Full Access Flexibility", fr: "Flexibilité Totale d'Accès", es: "Flexibilidad Total de Acceso" })}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-brand-muted text-lg"
          >
            {L({ ar: "نحن ندعم كافة طرق التحقق لضمان عدم تعطل الدخول مهما كانت الظروف.", en: "We support all verification methods to ensure entry is never interrupted.", fr: "Nous supportons toutes les méthodes de vérification pour garantir un accès ininterrompu.", es: "Soportamos todos los métodos de verificación para garantizar un acceso ininterrumpido." })}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {methods.map((method, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -10 }}
              className="group p-8 rounded-[2.5rem] bg-brand-surface/30 border border-white/5 hover:border-brand-secondary/30 transition-all relative overflow-hidden glass-card"
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${method.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-secondary mb-6 group-hover:scale-110 transition-transform">
                  <method.icon size={28} />
                </div>

                <h3 className="text-xl font-bold text-brand-text mb-4">
                  {method.title}
                </h3>

                <p className="text-sm text-brand-muted leading-relaxed mb-8">
                  {method.desc}
                </p>

                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-brand-muted tracking-widest">
                    {L({ ar: 'معدل الدقة', en: 'Accuracy', fr: 'Précision', es: 'Precisión' })}
                  </span>
                  <span className="text-sm font-black text-brand-secondary">
                    {method.accuracy}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AccessFlexibility;
