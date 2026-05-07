import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Cpu,
  Share2,
  Target,
  ShieldCheck,
  Zap,
  BarChart4,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../../utils/cn';

const FeaturesGrid = () => {
  const { t } = useTranslation();

  const features = [
    {
      id: 'f1',
      icon: BarChart4,
      title: t('landing.features.f1.title'),
      desc: t('landing.features.f1.desc'),
      badge: t('landing.features.f1.badge'),
      className: "lg:col-span-2 lg:row-span-2 bg-gradient-to-br from-brand-primary/10 to-brand-primary/5",
      iconColor: "text-brand-primary"
    },
    {
      id: 'f2',
      icon: Share2,
      title: t('landing.features.f2.title'),
      desc: t('landing.features.f2.desc'),
      badge: t('landing.features.f2.badge'),
      className: "lg:col-span-2 bg-white",
      iconColor: "text-brand-accent"
    },
    {
      id: 'f3',
      icon: Target,
      title: t('landing.features.f3.title'),
      desc: t('landing.features.f3.desc'),
      badge: t('landing.features.f3.badge'),
      className: "lg:col-span-2 bg-white",
      iconColor: "text-brand-primary"
    },
    {
      id: 'f4',
      icon: Cpu,
      title: t('landing.features.f4.title'),
      desc: t('landing.features.f4.desc'),
      badge: t('landing.features.f4.badge'),
      className: "lg:col-span-2 bg-white",
      iconColor: "text-brand-primary"
    },
    {
      id: 'f5',
      icon: Zap,
      title: t('landing.features.f5.title'),
      desc: t('landing.features.f5.desc'),
      badge: t('landing.features.f5.badge'),
      className: "lg:col-span-2 bg-white",
      iconColor: "text-brand-primary"
    },
    {
      id: 'f6',
      icon: ShieldCheck,
      title: t('landing.features.f6.title'),
      desc: t('landing.features.f6.desc'),
      badge: t('landing.features.f6.badge'),
      className: "lg:col-span-2 bg-white",
      iconColor: "text-brand-accent"
    }
  ];

  return (
    <section className="py-32 relative overflow-hidden" id="features">
      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/5 border border-brand-primary/10 mb-6"
          >
            <CheckCircle2 size={16} className="text-brand-primary" />
            <span className="text-brand-primary text-xs font-black uppercase tracking-[0.2em]">Core Capabilities</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black text-brand-dark mb-8 tracking-tight"
          >
            {t('landing.features.title')}
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className={cn(
                "group relative p-10 rounded-[40px] border border-brand-primary/10 overflow-hidden transition-all duration-500 hover:border-brand-primary/30 shadow-sm hover:shadow-xl",
                feature.className
              )}
            >
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className={cn("w-14 h-14 rounded-2xl bg-brand-light border border-brand-primary/10 flex items-center justify-center shadow-md transition-all duration-500 group-hover:scale-110 group-hover:bg-brand-primary", feature.iconColor)}>
                    <feature.icon className="w-7 h-7 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-brand-primary/5 rounded-full text-brand-primary/60">
                    {feature.badge}
                  </span>
                </div>

                <h3 className="text-2xl font-black text-brand-dark mb-4 group-hover:text-brand-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-brand-muted leading-relaxed text-sm md:text-base">
                  {feature.desc}
                </p>
              </div>

              {/* Hover Decorative Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/0 to-brand-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
