import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Presentation, 
  Building2, 
  Trophy,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../utils/cn';

const SolutionsSection = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'ar';
  const isRtl = currentLang === 'ar';

  const solutions = [
    { icon: Presentation, key: 's1' },
    { icon: Users, key: 's2' },
    { icon: Building2, key: 's3' },
    { icon: Trophy, key: 's4' }
  ];

  return (
    <section className="py-32 relative overflow-hidden bg-white" id="solutions">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/5 border border-brand-primary/10 mb-6"
          >
            <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
            <span className="text-brand-primary text-[10px] font-black uppercase tracking-widest">
              {t('landing.common_labels.solutions_badge')}
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-6xl font-black text-brand-dark leading-tight mb-6"
          >
            {t('landing.solutions.title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-brand-muted text-lg lg:text-xl max-w-2xl"
          >
            {t('landing.common_labels.solutions_desc')}
          </motion.p>
        </div>

        {/* Dashboard Preview Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-32 relative"
        >
          <div className="absolute inset-0 bg-brand-primary/5 rounded-[60px] blur-3xl -z-10 transform scale-95" />
          <div className="bg-brand-dark p-2 rounded-[40px] shadow-2xl border border-brand-primary/20 overflow-hidden group">
            <img 
              src="/diwan_specialized_solutions.png" 
              alt="Diwan Specialized Solutions" 
              className="w-full h-auto rounded-[34px] shadow-inner group-hover:scale-105 transition-transform duration-1000"
            />
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {solutions.map((solution, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative p-8 rounded-[32px] bg-brand-light border border-brand-primary/5 hover:border-brand-primary/30 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-xl"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand-primary/20 transition-all duration-500">
                  <solution.icon className="text-brand-primary" size={24} />
                </div>
                <h3 className="text-xl font-black text-brand-dark mb-3 leading-tight group-hover:text-brand-primary transition-colors">
                  {t(`landing.solutions.${solution.key}.title`)}
                </h3>
                <p className="text-brand-muted text-sm leading-relaxed mb-8">
                  {t(`landing.solutions.${solution.key}.desc`)}
                </p>
                <button className="flex items-center gap-2 text-[10px] font-black text-brand-primary/60 uppercase tracking-widest group-hover:text-brand-primary transition-colors">
                  {t('landing.common_labels.explore_solution')}
                  <ArrowRight size={14} className={cn("transition-transform group-hover:translate-x-1", isRtl ? "rotate-180" : "")} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionsSection;
