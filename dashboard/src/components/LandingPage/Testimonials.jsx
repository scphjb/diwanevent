import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Star, Quote } from 'lucide-react';

const Testimonials = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [current, setCurrent] = useState(0);

  const list = [
    {
      text: isRtl 
        ? "1,200 مشارك في أقل من 40 دقيقة. أسرع مما توقعنا بكثير بفضل تقنية ديوان." 
        : "1,200 attendees in less than 40 minutes. Way faster than we expected thanks to Diwan tech.",
      author: isRtl ? "منظم الجمعية العامة" : "General Assembly Organizer",
      org: isRtl ? "الغرفة الشرقية 2026" : "Eastern Chamber 2026",
      rating: 5
    },
    {
      text: isRtl 
        ? "أول منصة عربية تدعم البادجات العربية RTL بشكل صحيح. الباقي كان يقلب الأسماء!" 
        : "The first Arabic platform to support Arabic RTL badges correctly. Others flipped the names!",
      author: isRtl ? "مدير إداري" : "Admin Director",
      org: isRtl ? "وهران" : "Oran",
      rating: 5
    },
    {
      text: isRtl 
        ? "وفّرنا 3 ساعات من العمل اليدوي. الفريق لم يصدق أن الأمر بهذه السهولة." 
        : "We saved 3 hours of manual work. The team couldn't believe how easy it was.",
      author: isRtl ? "محضر قضائي" : "Judicial Officer",
      org: isRtl ? "عنابة" : "Annaba",
      rating: 5
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % list.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [list.length]);

  return (
    <section className="py-24 bg-brand-dark relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-5">
            <Quote size={300} className="text-brand-primary" />
        </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -20 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="flex justify-center gap-1 mb-8">
                {[...Array(list[current].rating)].map((_, i) => (
                  <Star key={i} size={20} fill="#D4AF37" color="#D4AF37" />
                ))}
              </div>

              <blockquote className="text-2xl md:text-4xl font-serif italic font-bold text-brand-text leading-relaxed mb-12">
                "{list[current].text}"
              </blockquote>

              <div className="flex flex-col items-center">
                <div className="w-16 h-1 bg-brand-secondary mb-4" />
                <cite className="not-italic">
                  <div className="text-xl font-black text-brand-text">{list[current].author}</div>
                  <div className="text-sm text-brand-muted uppercase tracking-[0.2em]">{list[current].org}</div>
                </cite>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-3 mt-16">
            {list.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`h-1.5 transition-all duration-500 rounded-full ${
                  current === idx ? 'w-12 bg-brand-secondary' : 'w-4 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
