import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Settings, Share2, TrendingUp } from 'lucide-react';
import { cn } from '../../utils/cn';

const WorkflowSection = () => {
  const { t } = useTranslation();

  const steps = [
    { icon: Settings, key: 'step1', color: 'text-brand-primary' },
    { icon: Share2, key: 'step2', color: 'text-brand-secondary' },
    { icon: TrendingUp, key: 'step3', color: 'text-brand-primary' }
  ];

  return (
    <section className="py-32 relative overflow-hidden bg-brand-light/30">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/5 border border-brand-primary/10 mb-6"
          >
            <span className="text-brand-primary text-[10px] font-black uppercase tracking-widest">
              {t('landing.common_labels.efficiency')}
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-6xl font-black text-brand-dark leading-tight"
          >
            {t('landing.workflow.title')}
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Connector Line */}
          <div className="hidden md:block absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-primary/10 to-transparent z-0" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative z-10 flex flex-col items-center text-center group"
            >
              <div className="w-24 h-24 rounded-3xl bg-white border border-brand-primary/10 flex items-center justify-center mb-8 relative group-hover:border-brand-primary/50 transition-all duration-500 shadow-xl">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-black text-xs shadow-lg">
                  {i + 1}
                </div>
                <step.icon className={cn(step.color.replace('secondary', 'primary'), "group-hover:scale-110 transition-transform")} size={32} />
              </div>
              <h3 className="text-2xl font-black text-brand-dark mb-4">
                {t(`landing.workflow.${step.key}.title`)}
              </h3>
              <p className="text-brand-muted text-sm leading-relaxed max-w-xs">
                {t(`landing.workflow.${step.key}.desc`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
