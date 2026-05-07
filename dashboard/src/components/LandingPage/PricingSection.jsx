import React from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../utils/useLang';

const PricingSection = () => {
  const { L, isRtl } = useLang();
  const navigate = useNavigate();

  const plans = [
    {
      name: L({ ar: "STARTER — مجاني", en: "STARTER — FREE", fr: "STARTER — GRATUIT", es: "STARTER — GRATIS" }),
      price: "0",
      icon: Zap,
      features: L({ 
        ar: ["حتى 200 مشارك", "تسجيل QR الأساسي", "تصدير Excel", "دعم بالبريد"],
        en: ["Up to 200 attendees", "Basic QR check-in", "Excel Export", "Email support"],
        fr: ["Jusqu'à 200 participants", "Enregistrement QR de base", "Export Excel", "Support par email"],
        es: ["Hasta 200 asistentes", "Registro QR básico", "Exportación Excel", "Soporte por email"]
      }),
      cta: L({ ar: "ابدأ مجاناً", en: "Start for Free", fr: "Commencer Gratuitement", es: "Empieza Gratis" }),
      highlight: false,
      path: '/signup'
    },
    {
      name: L({ ar: "PRO — الأكثر شيوعاً", en: "PRO — POPULAR", fr: "PRO — LE PLUS POPULAIRE", es: "PRO — MÁS POPULAR" }),
      price: L({ ar: "اتصل بنا", en: "Contact Us", fr: "Contactez-nous", es: "Contáctenos" }),
      icon: Crown,
      features: L({ 
        ar: ["حتى 1,500 مشارك", "كل ميزات Starter", "بادجات PDF + شهادات", "التحليلات المباشرة", "دعم الرعاة", "دعم أولوية"],
        en: ["Up to 1,500 attendees", "All Starter features", "PDF Badges + Certs", "Live Analytics", "Sponsor support", "Priority support"],
        fr: ["Jusqu'à 1 500 participants", "Toutes les fonctions Starter", "Badges PDF + Certificats", "Analyses en direct", "Support Sponsors", "Support prioritaire"],
        es: ["Hasta 1.500 asistentes", "Todas las funciones Starter", "Badges PDF + Certificados", "Analíticas en vivo", "Soporte a patrocinadores", "Soporte prioritario"]
      }),
      cta: L({ ar: "ابدأ التجربة المجانية", en: "Start Free Trial", fr: "Essai Gratuit", es: "Prueba Gratuita" }),
      highlight: true,
      path: '/request-demo'
    },
    {
      name: L({ ar: "ENTERPRISE", en: "ENTERPRISE", fr: "ENTREPRISE", es: "EMPRESA" }),
      price: L({ ar: "مخصص", en: "Custom", fr: "Sur Mesure", es: "Personalizado" }),
      icon: Rocket,
      features: L({ 
        ar: ["مشاركون غير محدودين", "API مفتوح", "Hardware integration", "خادم خاص (On-premise)", "SLA مضمون"],
        en: ["Unlimited attendees", "Open API", "Hardware integration", "On-premise server", "Guaranteed SLA"],
        fr: ["Participants illimités", "API ouverte", "Intégration matériel", "Serveur sur site", "SLA garanti"],
        es: ["Asistentes ilimitados", "API abierta", "Integración de hardware", "Servidor local", "SLA garantizado"]
      }),
      cta: L({ ar: "طلب عرض أسعار", en: "Request Quote", fr: "Demander Devis", es: "Solicitar Presupuesto" }),
      highlight: false,
      path: '/request-demo'
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-brand-dark relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-brand-text mb-6">
            {L({ ar: "أسعار شفافة — لا مفاجآت", en: "Transparent Pricing — No Surprises", fr: "Tarifs Transparents — Pas de Surprises", es: "Precios Transparentes — Sin Sorpresas" })}
          </h2>
          <p className="text-brand-muted max-w-2xl mx-auto">
            {L({ 
              ar: "ادفع حسب الفعالية — لا اشتراك شهري إلزامي. حلول مرنة تناسب ميزانيتك.", 
              en: "Pay per event — no mandatory monthly subscription. Flexible solutions for your budget.",
              fr: "Payez par événement — pas d'abonnement mensuel obligatoire. Solutions flexibles.",
              es: "Pague por evento — sin suscripción mensual obligatoria. Soluciones flexibles."
            })}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`relative flex flex-col p-10 rounded-[3rem] border transition-all duration-500 ${
                plan.highlight 
                ? 'bg-brand-surface border-brand-secondary/50 shadow-[0_30px_60px_-15px_rgba(212,175,55,0.2)] scale-105 z-10' 
                : 'bg-brand-surface/30 border-white/5 hover:border-white/20'
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-secondary text-brand-dark px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {L({ ar: "موصى به", en: "RECOMMENDED", fr: "RECOMMANDÉ", es: "RECOMENDADO" })}
                </div>
              )}

              <div className="mb-8">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-brand-secondary mb-6">
                    <plan.icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-brand-text mb-4">{plan.name}</h3>
                  <div className={`flex items-baseline gap-1 ${isRtl ? 'flex-row-reverse justify-end' : ''}`}>
                      <span className="text-4xl font-black text-brand-text">{plan.price}</span>
                      {plan.price === '0' && <span className="text-brand-muted font-bold">/ {L({ ar: 'فعالية', en: 'event', fr: 'évènement', es: 'evento' })}</span>}
                  </div>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map((feat, fIdx) => (
                  <li key={fIdx} className={`flex items-center gap-3 text-sm text-brand-text/80 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <Check size={16} className="text-brand-primary flex-shrink-0" />
                    <span className={isRtl ? 'text-right' : 'text-left'}>{feat}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => navigate(plan.path)}
                className={`w-full py-5 rounded-2xl font-black transition-all ${
                plan.highlight 
                ? 'bg-brand-secondary text-brand-dark hover:bg-brand-gold-light shadow-xl shadow-brand-secondary/20' 
                : 'bg-white/5 text-brand-text border border-white/10 hover:bg-white/10'
              }`}>
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
