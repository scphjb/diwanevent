import React from 'react';
import { motion } from 'framer-motion';
import { Network, Users, Mic2, Star, ShieldCheck } from 'lucide-react';
import { useLang } from '../../utils/useLang';

const EcosystemSection = () => {
  const { L, i18n } = useLang();

  const stakeholders = [
    {
      title: L({ ar: "للمنظمين", en: "For Organizers", fr: "Pour les Organisateurs", es: "Para Organizadores" }),
      desc: L({ ar: "سيطرة كاملة على البيانات، الحضور، والتقارير اللحظية.", en: "Complete control over data, attendance, and real-time reports.", fr: "Contrôle total des données, de la présence et des rapports en temps réel.", es: "Control total sobre datos, asistencia e informes en tiempo real." }),
      icon: ShieldCheck,
      color: "text-brand-primary"
    },
    {
      title: L({ ar: "للمتحدثين", en: "For Speakers", fr: "Pour les Intervenants", es: "Para Ponentes" }),
      desc: L({ ar: "بوابة خاصة لإدارة المحتوى والتفاعل المباشر مع الجمهور.", en: "Dedicated portal for content management and live audience interaction.", fr: "Portail dédié à la gestion de contenu et à l'interaction en direct avec le public.", es: "Portal dedicado a la gestión de contenido e interacción en vivo con el público." }),
      icon: Mic2,
      color: "text-brand-secondary"
    },
    {
      title: L({ ar: "للمشاركين", en: "For Participants", fr: "Pour les Participants", es: "Para Participantes" }),
      desc: L({ ar: "تجربة دخول سلسة، تشبيك مهني، ووصول فوري للمعلومات.", en: "Seamless entry, professional networking, and instant access to info.", fr: "Entrée fluide, réseautage professionnel et accès instantané à l'information.", es: "Entrada fluida, networking profesional y acceso instantáneo a la información." }),
      icon: Users,
      color: "text-blue-400"
    },
    {
      title: L({ ar: "للرعاة", en: "For Sponsors", fr: "Pour les Sponsors", es: "Para Patrocinadores" }),
      desc: L({ ar: "أدوات ترويجية ذكية، تحليل بيانات العارضين، وعائد استثمار واضح.", en: "Smart promotional tools, exhibitor data analytics, and clear ROI.", fr: "Outils promotionnels intelligents, analyse des données exposants et ROI clair.", es: "Herramientas promocionales inteligentes, análisis de datos de expositores y ROI claro." }),
      icon: Star,
      color: "text-orange-400"
    }
  ];

  return (
    <section className="py-24 bg-brand-dark/80 relative overflow-hidden" dir={i18n.dir()}>
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          <div className="lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 rounded-full border border-brand-primary/20 text-brand-primary text-sm font-bold mb-6"
            >
              <Network size={16} />
              <span>{L({ ar: 'نظام بيئي متكامل', en: 'INTEGRATED ECOSYSTEM', fr: 'ÉCOSYSTÈME INTÉGRÉ', es: 'ECOSISTEMA INTEGRADO' })}</span>
            </motion.div>

            <h2 className="text-4xl md:text-5xl font-black text-brand-text mb-8 leading-tight">
              {L({ ar: "منصة واحدة تربط جميع أطراف الفعالية", en: "One Platform Connecting All Stakeholders", fr: "Une Plateforme Connectant Toutes les Parties", es: "Una Plataforma Conectando a Todos" })}
            </h2>

            <p className="text-brand-muted text-lg mb-12">
              {L({
                ar: "ديوان ليس مجرد تطبيق، بل هو نظام بيئي يربط المنظمين بالجمهور والمتحدثين بالرعاة في حلقة تفاعلية واحدة تضمن نجاح الحدث من كافة جوانبه.",
                en: "Diwan is not just an app, it's an ecosystem that connects organizers with attendees and speakers with sponsors in a single interactive loop that ensures event success.",
                fr: "Diwan n'est pas qu'une application, c'est un écosystème qui relie organisateurs, participants, intervenants et sponsors dans une boucle interactive garantissant le succès de l'événement.",
                es: "Diwan no es solo una aplicación, es un ecosistema que conecta organizadores, asistentes, ponentes y patrocinadores en un ciclo interactivo que garantiza el éxito del evento."
              })}
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {stakeholders.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-brand-primary/20 transition-all"
                >
                  <item.icon className={`mb-4 ${item.color}`} size={24} />
                  <h4 className="text-lg font-bold text-brand-text mb-2">{item.title}</h4>
                  <p className="text-sm text-brand-muted leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2 relative">
            <div className="relative w-full max-w-lg mx-auto">
              <div className="absolute -inset-10 bg-brand-primary/10 rounded-full blur-[80px] animate-pulse" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative z-10 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl"
              >
                <img
                  src="/diwan_ecosystem_mockup_1777934217537.png"
                  alt="Diwan Ecosystem"
                  className="w-full h-auto"
                />
              </motion.div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default EcosystemSection;
