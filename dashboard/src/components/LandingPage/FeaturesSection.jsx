import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Zap, 
  BrainCircuit, 
  Target, 
  Smartphone, 
  Workflow, 
  ShieldCheck 
} from 'lucide-react';
import { cn } from '../../utils/cn';

const FeaturesSection = () => {
  const { t } = useTranslation();

  const features = [
    { icon: BrainCircuit, key: 'f1' },
    { icon: Target, key: 'f2' },
    { icon: Zap, key: 'f3' },
    { icon: Smartphone, key: 'f4' },
    { icon: Workflow, key: 'f5' },
    { icon: ShieldCheck, key: 'f6' }
  ];

  return (
    <section className="py-24 relative overflow-hidden" id="features">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-6"
            >
              <Zap className="text-brand-primary w-4 h-4" />
              <span className="text-brand-primary text-[10px] font-black uppercase tracking-widest">
                {t('landing.common_labels.capabilities')}
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-6xl font-black text-white leading-tight"
            >
              {t('landing.features.title')}
            </motion.h2>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-8 rounded-[40px] bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-500"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="w-14 h-14 rounded-2xl bg-brand-dark flex items-center justify-center border border-white/10 group-hover:bg-brand-primary group-hover:border-brand-primary transition-all duration-500">
                  <feature.icon className="text-white" size={24} />
                </div>
                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[8px] font-black text-white/40 uppercase tracking-widest">
                  {t(`landing.features.${feature.key}.badge`)}
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-4 group-hover:text-brand-secondary transition-colors">
                {t(`landing.features.${feature.key}.title`)}
              </h3>
              <p className="text-brand-muted text-sm leading-relaxed">
                {t(`landing.features.${feature.key}.desc`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
