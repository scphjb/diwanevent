import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Database,
  Cloud,
  Share2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLang } from '../../utils/useLang';

const IntegrationsSection = () => {
  const { t, i18n } = useTranslation();
  const { L, isRtl } = useLang();

  return (
    <section className="py-32 bg-brand-dark relative overflow-hidden" id="integrations" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Decorative lines */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute top-0 left-1/2 w-px h-full bg-brand-text -translate-x-1/2" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-brand-text -translate-y-1/2" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-20">

          {/* Content side */}
          <div className="lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className={cn("mb-12", isRtl ? "text-right" : "text-left")}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-6">
                <Share2 className="text-brand-primary w-4 h-4" />
                <span className="text-brand-primary text-[10px] font-black uppercase tracking-widest">{L({ ar: "تكامل تام", en: "FULL INTEGRATION", fr: "INTÉGRATION TOTALE", es: "INTEGRACIÓN TOTAL" })}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-brand-text mb-6 leading-tight">
                {L({ ar: "تكامل تام مع بيئتك التقنية", en: "Seamless Integration with Your Tech Stack", fr: "Intégration Complète avec Votre Stack Technique", es: "Integración Completa con su Stack Técnico" })}
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-8 rounded-[32px] glass-card border border-brand-border group hover:border-brand-secondary/40 transition-all duration-500"
              >
                <div className={cn("w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-6 text-brand-primary group-hover:scale-110 transition-transform", isRtl ? "mr-0" : "")}>
                  <Database size={24} />
                </div>
                <h3 className="text-xl font-black text-brand-text mb-2">{L({ ar: "مزامنة CRM", en: "CRM Sync", fr: "Synchronisation CRM", es: "Sincronización CRM" })}</h3>
                <p className="text-brand-muted text-sm">{L({ ar: "تصدير فوري لبيانات المهتمين", en: "Real-time lead export", fr: "Export instantané des leads", es: "Exportación instantánea de leads" })}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="p-8 rounded-[32px] glass-card border border-brand-border group hover:border-brand-secondary/40 transition-all duration-500"
              >
                <div className={cn("w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-6 text-brand-primary group-hover:scale-110 transition-transform", isRtl ? "mr-0" : "")}>
                  <Cloud size={24} />
                </div>
                <h3 className="text-xl font-black text-brand-text mb-2">{L({ ar: "Cloud API", en: "Cloud API", fr: "Cloud API", es: "Cloud API" })}</h3>
                <p className="text-brand-muted text-sm">{L({ ar: "قدرات REST كاملة ومفتوحة", en: "Full REST capabilities", fr: "Capacités REST complètes et ouvertes", es: "Capacidades REST completas y abiertas" })}</p>
              </motion.div>
            </div>
          </div>

          {/* Visualization side */}
          <div className="lg:w-1/2 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative rounded-[48px] overflow-hidden shadow-2xl border-8 border-white/5 bg-brand-dark"
            >
              <img
                src="/ecosystem.png"
                alt="Diwan Ecosystem"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 to-transparent" />

              {/* Floating Integration Badge */}
              <div className="absolute bottom-8 start-8 glass-card p-6 rounded-3xl shadow-xl border border-brand-border flex items-center gap-4 animate-bounce-slow">
                <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white">
                  <Share2 size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{L({ ar: "مزامنة النظام", en: "System Sync", fr: "Sync Système", es: "Sync del Sistema" })}</div>
                  <div className="text-sm font-black text-brand-text">{L({ ar: "API متصل", en: "API Connected", fr: "API Connecté", es: "API Conectado" })}</div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;
