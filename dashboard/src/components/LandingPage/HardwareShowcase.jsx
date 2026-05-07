import React from 'react';
import { Smartphone, Scan, Monitor, UserCheck, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLang } from '../../utils/useLang';

const HardwareShowcase = () => {
  const { L, isRtl } = useLang();

  const modes = [
    {
      icon: Smartphone,
      title: L({ ar: "موبايل QR", en: "Mobile QR", fr: "QR Mobile", es: "QR Móvil" }),
      desc: L({ 
        ar: "استخدم أي هاتف ذكي كجهاز مسح عبر تطبيق المنظمين.", 
        en: "Use any smartphone as a scanning device via the organizer app.",
        fr: "Utilisez n'importe quel smartphone comme scanner via l'application organisateur.",
        es: "Use cualquier smartphone como escáner a través de la aplicación de organizadores."
      }),
      accuracy: "99.9%"
    },
    {
      icon: Scan,
      title: L({ ar: "ماسح USB", en: "USB Scanner", fr: "Scanner USB", es: "Escáner USB" }),
      desc: L({ 
        ar: "تكامل مباشر مع الماسحات الضوئية اللاسلكية للسرعة القصوى.", 
        en: "Direct integration with wireless scanners for maximum speed.",
        fr: "Intégration directe avec les scanners sans fil pour une vitesse maximale.",
        es: "Integración directa con escáneres inalámbricos para máxima velocidad."
      }),
      accuracy: "100%"
    },
    {
      icon: Monitor,
      title: L({ ar: "منصة الخدمة الذاتية", en: "Self-service Kiosk", fr: "Borne Libre-service", es: "Quiosco de Autoservicio" }),
      desc: L({ 
        ar: "محطات تسجيل حضور ذاتي للمشاركين لتقليل الازدحام.", 
        en: "Self-registration kiosks for participants to reduce crowding.",
        fr: "Bornes d'auto-enregistrement pour réduire l'affluence.",
        es: "Quioscos de autorregistro para reducir aglomeraciones."
      }),
      accuracy: "99.5%"
    },
    {
      icon: UserCheck,
      title: L({ ar: "التحقق الإداري", en: "Admin Manual", fr: "Manuel Admin", es: "Manual Admin" }),
      desc: L({ 
        ar: "إمكانية التحقق اليدوي بالاسم أو رقم الهاتف للحالات الاستثنائية.", 
        en: "Manual verification by name or phone for exceptional cases.",
        fr: "Vérification manuelle par nom ou téléphone pour les cas exceptionnels.",
        es: "Verificación manual por nombre o teléfono para casos excepcionales."
      }),
      accuracy: "---"
    }
  ];

  return (
    <section className="py-32 bg-brand-dark" id="hardware">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-black text-brand-text mb-4">
            {L({ ar: "مرونة كاملة في الوصول", en: "Full Access Flexibility", fr: "Flexibilité Totale d'Accès", es: "Flexibilidad Total de Acceso" })}
          </h2>
          <p className="text-brand-muted max-w-2xl mx-auto">
            {L({ 
              ar: "نحن ندعم كافة طرق التحقق لضمان عدم تعطل الدخول مهما كانت الظروف.", 
              en: "We support all verification methods to ensure entry is never disrupted.",
              fr: "Nous supportons toutes les méthodes de vérification pour garantir un accès fluide.",
              es: "Soportamos todos los métodos de verificación para asegurar que el acceso nunca se interrumpa."
            })}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {modes.map((mode, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="glass-card p-8 rounded-[2.5rem] border border-brand-border relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-brand-text">
                <mode.icon size={80} />
              </div>
              
              <div className="w-14 h-14 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center mb-6">
                <mode.icon size={28} />
              </div>

              <h3 className="text-xl font-bold text-brand-text mb-3 relative z-10">{mode.title}</h3>
              <p className="text-sm text-brand-muted mb-6 leading-relaxed relative z-10">{mode.desc}</p>
              
              <div className="flex items-center gap-2 pt-4 border-t border-white/5 relative z-10">
                <ShieldCheck size={16} className="text-brand-primary" />
                <span className="text-[10px] font-bold text-brand-primary uppercase">
                  {L({ ar: "معدل الدقة: ", en: "Accuracy: ", fr: "Précision: ", es: "Precisión: " })} {mode.accuracy}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HardwareShowcase;
