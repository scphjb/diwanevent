import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronDown, HelpCircle, MessageSquare } from 'lucide-react';
import { cn } from '../../utils/cn';

const FAQSection = () => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    { q: 'q1', a: 'a1' },
    { q: 'q2', a: 'a2' }
  ];

  return (
    <section className="py-32 relative overflow-hidden bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/5 border border-brand-primary/10 mb-6"
            >
              <HelpCircle className="text-brand-primary w-4 h-4" />
              <span className="text-brand-primary text-[10px] font-black uppercase tracking-widest">
                {t('landing.common_labels.faq_badge')}
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl lg:text-6xl font-black text-brand-dark leading-tight mb-6"
            >
              {t('landing.faq.title')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-brand-muted text-lg"
            >
              {t('landing.common_labels.faq_sub')}
            </motion.p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "rounded-3xl border transition-all duration-300 overflow-hidden",
                  activeIndex === i
                    ? "bg-brand-primary/5 border-brand-primary/30"
                    : "bg-brand-light border-brand-primary/5 hover:border-brand-primary/20"
                )}
              >
                <button
                  onClick={() => setActiveIndex(activeIndex === i ? null : i)}
                  className="flex items-center justify-between w-full p-8 text-left"
                >
                  <span className="text-xl font-bold text-brand-dark pr-8">
                    {t(`landing.faq.${faq.q}`)}
                  </span>
                  <div className={cn(
                    "w-10 h-10 rounded-xl bg-brand-primary/5 flex items-center justify-center transition-transform duration-300",
                    activeIndex === i ? "rotate-180 bg-brand-primary/20" : ""
                  )}>
                    <ChevronDown className={cn("text-brand-primary/40", activeIndex === i ? "text-brand-primary" : "")} />
                  </div>
                </button>

                <AnimatePresence>
                  {activeIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-8 pb-8 text-brand-muted leading-relaxed">
                        <div className="h-px bg-brand-primary/10 mb-6" />
                        {t(`landing.faq.${faq.a}`)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={cn(
              "mt-16 p-8 rounded-[40px] bg-brand-dark border border-brand-primary/10 flex flex-col sm:flex-row items-center justify-between gap-8",
              t('direction') === 'rtl' ? "sm:flex-row-reverse" : ""
            )}
          >
            <div className={cn("flex items-center gap-6", t('direction') === 'rtl' ? "text-right flex-row-reverse" : "text-left")}>
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/20 flex items-center justify-center">
                <MessageSquare className="text-brand-primary" />
              </div>
              <div>
                <div className="text-white font-bold text-lg">{t('landing.faq.still_questions')}</div>
                <div className="text-white/60 text-sm">{t('landing.faq.help_text')}</div>
              </div>
            </div>
            <button className="px-8 py-4 bg-brand-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-primary/90 transition-colors">
              {t('landing.faq.contact_cta')}
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
