import React from 'react';
import { motion } from 'framer-motion';
import { Landmark, Scale, Store, GraduationCap, CheckCircle2 } from 'lucide-react';
import { useLang } from '../../utils/useLang';

const EventTypes = () => {
  const { L, isRtl } = useLang();

  const types = [
    {
      title: L({ ar: "مؤتمرات علمية", en: "Scientific Conferences", fr: "Conférences Scientifiques", es: "Conferencias Científicas" }),
      desc: L({ 
        ar: "إدارة جلسات متعددة، متحدثون، بادجات مخصصة وتتبع الحضور لكل جلسة.", 
        en: "Manage multi-sessions, speakers, custom badges and track attendance per session.",
        fr: "Gestion multi-sessions, intervenants, badges personnalisés et suivi par session.",
        es: "Gestión de sesiones múltiples, ponentes, badges personalizados y seguimiento por sesión."
      }),
      icon: Landmark,
      features: L({ 
        ar: ["بادجات مخصصة", "تتبع المتحدثين", "شهادات حضور"],
        en: ["Custom badges", "Speaker tracking", "Attendance certs"],
        fr: ["Badges personnalisés", "Suivi intervenants", "Certificats"],
        es: ["Badges personalizados", "Seguimiento de ponentes", "Certificados"]
      })
    },
    {
      title: L({ ar: "جمعيات عامة", en: "General Assemblies", fr: "Assemblées Générales", es: "Asambleas Generales" }),
      desc: L({ 
        ar: "تصويت، حضور رسمي، ضبط النصاب القانوني واستخراج محضر قانوني PDF فورياً.", 
        en: "Voting, official attendance, quorum control and instant PDF legal reports.",
        fr: "Vote, présence officielle, contrôle du quorum et rapports légaux PDF.",
        es: "Votación, asistencia oficial, control de quórum e informes legales PDF."
      }),
      icon: Scale,
      features: L({ 
        ar: ["ضبط النصاب", "تصويت إلكتروني", "محضر رسمي"],
        en: ["Quorum control", "E-voting", "Official report"],
        fr: ["Contrôle quorum", "Vote électronique", "Rapport officiel"],
        es: ["Control de quórum", "Voto electrónico", "Informe oficial"]
      })
    },
    {
      title: L({ ar: "معارض ومهرجانات", en: "Exhibitions & Festivals", fr: "Expositions et Festivals", es: "Exposiciones y Festivales" }),
      desc: L({ 
        ar: "عارضون، رعاة، إدارة العملاء المحتملين (leads) ومتابعة حركة الزوار.", 
        en: "Exhibitors, sponsors, lead management and visitor flow tracking.",
        fr: "Exposants, sponsors, gestion de leads et suivi du flux visiteurs.",
        es: "Expositores, patrocinadores, gestión de leads y seguimiento de visitantes."
      }),
      icon: Store,
      features: L({ 
        ar: ["إدارة الرعاة", "تتبع الزوار", "مخرجات تسويقية"],
        en: ["Sponsor mgmt", "Visitor tracking", "Marketing output"],
        fr: ["Gestion sponsors", "Suivi visiteurs", "Marketing"],
        es: ["Gestión sponsors", "Seguimiento visitantes", "Marketing"]
      })
    },
    {
      title: L({ ar: "ورشات وتدريبات", en: "Workshops & Training", fr: "Ateliers et Formations", es: "Talleres y Formaciones" }),
      desc: L({ 
        ar: "شهادات حضور أوتوماتيكية، تقييم جلسات، ونظام جمع الملاحظات (feedback).", 
        en: "Automatic certificates, session evaluation, and feedback collection system.",
        fr: "Certificats automatiques, évaluation de session et système de feedback.",
        es: "Certificados automáticos, evaluación de sesiones y sistema de feedback."
      }),
      icon: GraduationCap,
      features: L({ 
        ar: ["تقييم جلسات", "شهادات أوتوماتيكية", "متابعة يومية"],
        en: ["Session evaluation", "Auto certs", "Daily follow-up"],
        fr: ["Évaluation sessions", "Certificats auto", "Suivi quotidien"],
        es: ["Evaluación sesiones", "Certificados auto", "Seguimiento diario"]
      })
    }
  ];

  return (
    <section className="py-32 bg-brand-dark relative overflow-hidden" id="solutions">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-brand-text mb-6">
            {L({ ar: "يناسب كل أنواع تجمعاتك", en: "Fits All Your Gatherings", fr: "Adapté à Tous vos Événements", es: "Adaptado a Todos sus Eventos" })}
          </h2>
          <p className="text-brand-muted max-w-2xl mx-auto">
            {L({ 
              ar: "مهما كانت طبيعة فعاليتك، ديوان يوفر لك الأدوات القانونية والتقنية اللازمة للنجاح.", 
              en: "Whatever your event's nature, Diwan provides the legal and technical tools for success.",
              fr: "Peu importe la nature de votre événement, Diwan fournit les outils nécessaires.",
              es: "No importa la naturaleza de su evento, Diwan proporciona las herramientas necesarias."
            })}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {types.map((type, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card rounded-[2.5rem] p-8 border-brand-border hover:border-brand-secondary/40 transition-all group"
            >
              <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-secondary mb-8 group-hover:rotate-12 transition-transform">
                <type.icon size={32} />
              </div>
              
              <div className={isRtl ? "text-right" : "text-left"}>
                <h3 className="text-2xl font-bold text-brand-text mb-4">{type.title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed mb-8">{type.desc}</p>
              </div>
              
              <ul className="space-y-3 pt-6 border-t border-white/5">
                {type.features.map((feat, fIdx) => (
                  <li key={fIdx} className={`flex items-center gap-2 text-xs text-brand-text/70 font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <CheckCircle2 size={14} className="text-brand-primary flex-shrink-0" />
                    <span className={isRtl ? 'text-right' : 'text-left'}>{feat}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EventTypes;
