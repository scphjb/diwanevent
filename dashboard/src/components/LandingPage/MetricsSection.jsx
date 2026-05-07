import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Printer, Headphones } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLang } from '../../utils/useLang';

const MetricsSection = () => {
  const { L, isRtl } = useLang();

  const metrics = [
    { 
        label: L({ ar: 'قدرة استيعاب النظام', en: 'Handling Capacity', fr: 'Capacité de Traitement', es: 'Capacidad de Procesamiento' }), 
        value: '10,000+', 
        icon: Zap 
    },
    { 
        label: L({ ar: 'وقت التشغيل', en: 'System Uptime', fr: 'Temps de Fonctionnement', es: 'Tiempo de Actividad' }), 
        value: '99.9%', 
        icon: Shield 
    },
    { 
        label: L({ ar: 'سرعة الدخول', en: 'Check-in Speed', fr: 'Vitesse d\'Entrée', es: 'Velocidad de Acceso' }), 
        value: '< 3s', 
        icon: Printer 
    },
    { 
        label: L({ ar: 'دعم فني', en: 'Technical Support', fr: 'Support Technique', es: 'Soporte Técnico' }), 
        value: '24/7', 
        icon: Headphones 
    },
  ];

  return (
    <section className="py-32 relative overflow-hidden bg-brand-dark">
      <div className="container mx-auto px-6">
        <div className="bg-brand-surface rounded-[48px] p-12 md:p-20 relative overflow-hidden shadow-2xl border border-white/5">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-primary/10 rounded-full blur-[100px] -mr-40 -mt-40" />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 md:gap-20">
            {metrics.map((metric, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`flex flex-col items-center lg:items-start text-center lg:text-left group ${isRtl ? 'lg:items-end lg:text-right' : ''}`}
              >
                <div className={cn("mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12", "text-brand-secondary")}>
                  <metric.icon size={32} />
                </div>
                <div className="text-4xl md:text-6xl font-black text-brand-text mb-4 tracking-tighter">
                  {metric.value}
                </div>
                <div className="text-brand-muted text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                  {metric.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MetricsSection;
