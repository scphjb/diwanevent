import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Printer, BarChart3, Presentation, Users2 } from 'lucide-react';
import { useLang } from '../../utils/useLang';

const ProductExperience = () => {
  const { L, isRtl } = useLang();
  const [activeTab, setActiveTab] = useState(0);

  const experiences = [
    {
      id: 'presence',
      title: L({ ar: 'الحضور الذكي', en: 'Smart Presence', fr: 'Présence', es: 'Presencia' }),
      desc: L({ 
        ar: 'تحقق من الحضور في أجزاء من الثانية مع نظام المسح المتطور.', 
        en: 'Check-in attendees in milliseconds with our advanced scanning system.',
        fr: 'Enregistrez les participants en quelques millisecondes avec notre système avancé.',
        es: 'Registre a los asistentes en milisegundos con nuestro sistema avanzado.'
      }),
      icon: QrCode,
      image: '/diwan_presence_realistic_1778142853963.png'
    },
    {
      id: 'badges',
      title: L({ ar: 'الشارات الفورية', en: 'Instant Badges', fr: 'Badges', es: 'Badges' }),
      desc: L({ 
        ar: 'طباعة احترافية وفورية للشارات عند وصول المشارك.', 
        en: 'Professional and instant badge printing upon participant arrival.',
        fr: 'Impression professionnelle et instantanée des badges à l\'arrivée.',
        es: 'Impresión profesional e instantánea de badges a la llegada.'
      }),
      icon: Printer,
      image: '/diwan_badges_realistic_1778142869329.png'
    },
    {
      id: 'engagement',
      title: L({ ar: 'التفاعل المباشر', en: 'Live Engagement', fr: 'Engagement', es: 'Compromiso' }),
      desc: L({ 
        ar: 'راقب نبض الفعالية مع إحصائيات وتفاعلات لحظية.', 
        en: 'Monitor the event pulse with real-time analytics and interactions.',
        fr: 'Surveillez le pouls de l\'événement avec des analyses en temps réel.',
        es: 'Monitoree el pulso del evento con analíticas en tiempo real.'
      }),
      icon: BarChart3,
      image: '/diwan_engagement_realistic_1778142884266.png'
    },
    {
      id: 'content',
      title: L({ ar: 'إدارة المحتوى', en: 'Content Management', fr: 'Contenu', es: 'Contenido' }),
      desc: L({ 
        ar: 'جدول أعمال ذكي وسهولة الوصول لكافة معلومات الجلسات.', 
        en: 'Smart agenda and easy access to all session information.',
        fr: 'Agenda intelligent et accès facile à toutes les informations de session.',
        es: 'Agenda inteligente y fácil acceso a toda la información de las sesiones.'
      }),
      icon: Presentation,
      image: '/diwan_content_realistic_1778142897167.png'
    },
    {
      id: 'networking',
      title: L({ ar: 'التواصل الاحترافي الذكي', en: 'Smart Networking', fr: 'Réseautage', es: 'Networking' }),
      desc: L({ 
        ar: 'اربط المشاركين ببعضهم البعض بناءً على اهتماماتهم المشتركة.', 
        en: 'Connect participants based on their shared professional interests.',
        fr: 'Connectez les participants en fonction de leurs intérêts partagés.',
        es: 'Conecte a los participantes según sus intereses compartidos.'
      }),
      icon: Users2,
      image: '/diwan_networking_realistic_1778142912618.png'
    }
  ];

  return (
    <section className="py-32 bg-brand-dark relative overflow-hidden" id="experience">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          
          {/* Text & Tabs Side */}
          <div className={`lg:w-2/5 ${isRtl ? 'lg:text-right' : 'lg:text-left'}`}>
            <h2 className="text-4xl md:text-5xl font-black text-brand-text mb-8 leading-tight">
              {L({ 
                ar: 'تجربة واقعية تليق بفعاليتك', 
                en: 'A Realistic Experience for Your Event',
                fr: 'Une Expérience Réelle pour votre Événement',
                es: 'Una Experiencia Real para su Evento'
              })}
            </h2>
            
            <div className="space-y-4">
              {experiences.map((exp, idx) => (
                <button
                  key={exp.id}
                  onClick={() => setActiveTab(idx)}
                  className={`w-full p-6 rounded-2xl transition-all flex items-center gap-6 border ${
                    activeTab === idx 
                    ? 'bg-brand-primary/10 border-brand-primary/40 text-brand-text' 
                    : 'bg-transparent border-white/5 text-brand-muted hover:border-white/10'
                  } ${isRtl ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`p-3 rounded-xl ${activeTab === idx ? 'bg-brand-primary text-white' : 'bg-white/5'}`}>
                    <exp.icon size={24} />
                  </div>
                  <div className={isRtl ? 'text-right' : 'text-left'}>
                    <h3 className="text-xl font-bold mb-1">{exp.title}</h3>
                    {activeTab === idx && (
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-sm text-brand-muted leading-relaxed"
                      >
                        {exp.desc}
                      </motion.p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Animated Image Side */}
          <div className="lg:w-3/5 relative aspect-video w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative w-full h-full rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white/5"
              >
                {/* Slow Zoom Motion Container */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-full h-full"
                >
                  <img 
                    src={experiences[activeTab].image} 
                    alt={experiences[activeTab].title} 
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 via-transparent to-transparent" />
                
                {/* Floating Info Tag */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className={`absolute bottom-8 ${isRtl ? 'right-8' : 'left-8'} bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full flex items-center gap-3`}
                >
                  <div className="w-2 h-2 rounded-full bg-brand-secondary animate-pulse" />
                  <span className="text-sm font-black text-white uppercase tracking-widest">
                    {experiences[activeTab].title}
                  </span>
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Background Glow */}
            <div className="absolute -inset-10 bg-brand-primary/20 blur-[100px] rounded-full -z-10" />
          </div>

        </div>
      </div>
    </section>
  );
};

export default ProductExperience;
