import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, CreditCard, Users, CheckCircle2, MessageSquare, Layout } from 'lucide-react';
import { useLang } from '../../utils/useLang';

const FeatureTabs = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { L, isRtl, i18n } = useLang();

  const tabs = [
    {
      id: 0,
      label: L({ ar: "تسجيل الحضور", en: "Attendance", fr: "Présence", es: "Asistencia" }),
      icon: QrCode,
      title: L({ ar: "تسجيل الحضور الذكي", en: "Smart Check-in", fr: "Enregistrement Intelligent", es: "Registro Inteligente" }),
      content: L({ 
        ar: "نظام مسح متطور يضمن انسيابية تامة لضيوفك مهما كان حجم الفعالية.", 
        en: "Advanced scanning system ensuring complete flow for your guests regardless of the event size.",
        fr: "Système de scan avancé garantissant une fluidité totale pour vos invités.",
        es: "Sistema de escaneo avanzado que garantiza un flujo completo para sus invitados."
      }),
      features: [
        L({ ar: "مسح فائق السرعة (أقل من 0.5 ثانية)", en: "Ultra-fast scanning (less than 0.5 seconds)", fr: "Scan ultra-rapide (moins de 0,5 seconde)", es: "Escaneo ultrarrápido (menos de 0,5 segundos)" }),
        L({ ar: "دعم وضع الأوفلاين الكامل مع مزامنة لاحقة", en: "Full offline mode with background sync", fr: "Mode hors ligne complet avec synchronisation en arrière-plan", es: "Modo offline completo con sincronización en segundo plano" }),
        L({ ar: "تنبيهات فورية للمنظمين عند دخول كبار الشخصيات", en: "Instant VIP entry alerts for organizers", fr: "Alertes instantanées d'entrée VIP pour les organisateurs", es: "Alertas instantáneas de entrada VIP para organizadores" })
      ],
      image: '/diwan_presence_realistic.png'
    },
    {
      id: 1,
      label: L({ ar: "الشارات", en: "Badges", fr: "Badges", es: "Acreditaciones" }),
      icon: CreditCard,
      title: L({ ar: "الشارات الفورية", en: "Instant Badges", fr: "Badges Numériques", es: "Acreditaciones Digitales" }),
      content: L({ ar: "طباعة حرارية فورية تشمل كافة البيانات وQR كود الفعالية بمجرد وصول المشارك.", en: "Instant thermal printing including all data and event QR code upon arrival.", fr: "Impression thermique instantanée incluant toutes les données et le QR code.", es: "Impresión térmica instantánea que incluye todos los datos y el código QR." }),
      features: [
        L({ ar: "طباعة حرارية فورية عند الدخول (بدون حبر)", en: "Instant thermal printing (ink-free)", fr: "Impression thermique instantanée (sans encre)", es: "Impresión térmica instantánea (sin tinta)" }),
        L({ ar: "تصميمات مخصصة لكل فئة (حضور، عارض، صحافة)", en: "Custom designs for each category", fr: "Designs personnalisés par catégorie", es: "Diseños personalizados por categoría" }),
        L({ ar: "دعم كامل للخطوط العربية والرموز الخاصة", en: "Full support for Arabic fonts and symbols", fr: "Support complet des polices arabes et caractères spéciaux", es: "Soporte completo de fuentes árabes y caracteres especiales" })
      ],
      image: '/diwan_badges_realistic.png'
    },
    {
        id: 2,
        label: L({ ar: "التفاعل الحي", en: "Engagement", fr: "Engagement", es: "Interacción" }),
        icon: MessageSquare,
        title: L({ ar: "التفاعل المباشر", en: "Live Engagement", fr: "Engagement en Direct", es: "Interacción en Vivo" }),
        content: L({ 
          ar: "حوّل حضورك إلى مشاركين فاعلين عبر التصويت الحي، الأسئلة المباشرة، والمعرض الاجتماعي.", 
          en: "Transform your attendees into active participants through live polls, direct Q&A, and social walls.",
          fr: "Transformez vos participants en acteurs engagés grâce aux sondages en direct, Q&R et murs sociaux.",
          es: "Transforme a sus asistentes en participantes activos mediante encuestas en vivo, Q&A directas y muros sociales."
        }),
        features: [
          L({ ar: "نظام أسئلة وأجوبة (Q&A) مع إمكانية الإشراف", en: "Moderated Q&A system for sessions", fr: "Système Q&R modéré pour les sessions", es: "Sistema Q&A moderado para las sesiones" }),
          L({ ar: "تصويت حي (Live Polls) تظهر نتائجه فوراً على الشاشات", en: "Live Polls with instant results display", fr: "Sondages en direct avec affichage instantané des résultats", es: "Encuestas en vivo con resultados instantáneos en pantalla" }),
          L({ ar: "المعرض الاجتماعي (Social Wall) لعرض مشاركات الجمهور", en: "Social Wall to showcase audience posts", fr: "Mur Social pour afficher les publications du public", es: "Muro Social para mostrar publicaciones del público" })
        ],
        image: '/diwan_engagement_realistic.png'
      },
      {
        id: 3,
        label: L({ ar: "إدارة المحتوى", en: "Content", fr: "Contenu", es: "Contenido" }),
        icon: Layout,
        title: L({ ar: "إدارة الأجندة والمتحدثين", en: "Content & Agenda", fr: "Contenu et Agenda", es: "Contenido y Agenda" }),
        content: L({ 
          ar: "تحكم كامل في جدول الفعالية، ملفات المتحدثين، ومعلومات الرعاة من لوحة تحكم واحدة.", 
          en: "Complete control over event schedule, speaker profiles, and sponsor info from one dashboard.",
          fr: "Contrôle total du planning, des profils intervenants et des infos sponsors depuis un seul tableau de bord.",
          es: "Control total del cronograma, perfiles de ponentes e información de patrocinadores desde un solo panel."
        }),
        features: [
          L({ ar: "بوابة خاصة للمتحدثين لرفع وإدارة عروضهم", en: "Dedicated speaker portal for content management", fr: "Portail dédié aux intervenants pour gérer leur contenu", es: "Portal dedicado para ponentes para gestionar su contenido" }),
          L({ ar: "أجندة تفاعلية متزامنة لحظياً مع تطبيق الحضور", en: "Interactive agenda synced live with attendee app", fr: "Agenda interactif synchronisé en direct avec l'app participants", es: "Agenda interactiva sincronizada en vivo con la app de asistentes" }),
          L({ ar: "أدوات ترويجية ذكية للرعاة والعارضين", en: "Smart promotional tools for sponsors & exhibitors", fr: "Outils promotionnels intelligents pour sponsors et exposants", es: "Herramientas promocionales inteligentes para patrocinadores y expositores" })
        ],
        image: '/diwan_content_realistic.png'
      },
      {
        id: 4,
        label: L({ ar: "تواصل المشاركين", en: "Networking", fr: "Réseautage", es: "Networking" }),
        icon: Users,
        title: L({ ar: "تواصل المحترفين", en: "Professional Networking", fr: "Réseautage Professionnel", es: "Networking Profesional" }),
        content: L({ ar: "نظام تواصل ذكي يربط المشاركين ببعضهم البعض بناءً على اهتماماتهم المهنية.", en: "Smart networking system connecting participants based on professional interests.", fr: "Système de réseautage intelligent reliant les participants selon leurs intérêts.", es: "Sistema de networking inteligente que conecta a los participantes según sus intereses." }),
        features: [
          L({ ar: "مطابقة ذكية بالذكاء الاصطناعي حسب الاهتمامات", en: "AI-driven smart matching based on interests", fr: "Mise en relation intelligente par IA selon les intérêts", es: "Emparejamiento inteligente por IA según intereses" }),
          L({ ar: "دردشة داخلية آمنة لتبادل الفرص المهنية", en: "Secure internal chat for professional opportunities", fr: "Chat interne sécurisé pour les opportunités professionnelles", es: "Chat interno seguro para oportunidades profesionales" }),
          L({ ar: "تبادل بطاقات الأعمال الرقمية بلمسة واحدة", en: "One-touch digital business card exchange", fr: "Échange de cartes de visite numériques en un clic", es: "Intercambio de tarjetas de visita digitales con un toque" })
        ],
        image: '/diwan_networking_realistic.png'
      }
  ];

  return (
    <section id="features" className="py-24 bg-brand-dark/50 overflow-hidden" dir={i18n.dir()}>
      <div className="container mx-auto px-6">
        
        {/* Tabs Headers */}
        <div className="flex flex-wrap justify-center gap-2 mb-16">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
                activeTab === idx 
                ? 'bg-brand-primary text-brand-text shadow-lg shadow-brand-primary/20' 
                : 'text-brand-muted hover:bg-white/5'
              }`}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center bg-brand-surface/30 rounded-[3rem] p-8 md:p-16 border border-white/5 glass-card relative overflow-hidden">
          
          {/* Text Content — always in reading-start column */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: isRtl ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? -30 : 30 }}
              transition={{ duration: 0.4 }}
              className="relative z-10"
            >
              <h3 className="text-4xl font-black text-brand-text mb-6">{tabs[activeTab].title}</h3>
              <p className="text-xl text-brand-muted leading-relaxed mb-8">
                {tabs[activeTab].content}
              </p>

              <ul className="space-y-4">
                {tabs[activeTab].features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-brand-text/80">
                    <div className="w-6 h-6 bg-brand-primary/20 rounded-full flex items-center justify-center text-brand-primary shrink-0">
                        <CheckCircle2 size={14} />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          {/* Image — always in reading-end column */}
          <div className={`h-[450px] bg-brand-dark/40 rounded-[2rem] border border-white/5 overflow-hidden relative group ${isRtl ? 'order-first' : ''}`}>
             <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.8 }}
                    className="w-full h-full"
                >
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="w-full h-full"
                    >
                        <img 
                          src={tabs[activeTab].image} 
                          alt={tabs[activeTab].title} 
                          className="w-full h-full object-cover"
                        />
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 via-transparent to-transparent" />
                </motion.div>
             </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
};

export default FeatureTabs;
