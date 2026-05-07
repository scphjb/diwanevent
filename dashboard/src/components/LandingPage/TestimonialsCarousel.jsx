import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';

const TestimonialsCarousel = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [current, setCurrent] = useState(0);

  const testimonials = [
    {
      text: isRtl 
        ? "وفرنا 3 ساعات من العمل اليدوي في أول ملتقى جربنا فيه المنصة. الدقة والسرعة لا توصف." 
        : "We saved 3 hours of manual work in the first forum we tried the platform. The accuracy and speed are indescribable.",
      author: isRtl ? "محضر قضائي" : "Judicial Officer",
      org: isRtl ? "الغرفة الشرقية" : "Eastern Chamber",
      rating: 5
    },
    {
      text: isRtl 
        ? "سرعة المسح مذهلة — 1,200 مشارك في أقل من 40 دقيقة دون أي خطأ تقني واحد." 
        : "Scanning speed is amazing — 1,200 participants in less than 40 minutes without a single technical error.",
      author: isRtl ? "منظم فعالية" : "Event Organizer",
      org: isRtl ? "تجمعات شبابية" : "Youth Gatherings",
      rating: 5
    },
    {
      text: isRtl 
        ? "أول منصة عربية أرى فيها دعماً حقيقياً للـ RTL والبادجات العربية بهذا المستوى من الاحترافية." 
        : "The first Arabic platform where I see real RTL support and Arabic badges with this level of professionalism.",
      author: isRtl ? "مسؤول إداري" : "Administrative Officer",
      org: isRtl ? "هيئة حكومية" : "Government Body",
      rating: 5
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const next = () => setCurrent((current + 1) % testimonials.length);
  const prev = () => setCurrent((current - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="py-24 bg-brand-light relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-10">
            <div className="p-4 bg-brand-primary/10 rounded-full text-brand-primary">
              <Quote size={40} fill="currentColor" className="opacity-20" />
            </div>
          </div>

          <div className="relative min-h-[300px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -10 }}
                transition={{ duration: 0.5 }}
                className="bg-white p-8 md:p-16 rounded-[3rem] shadow-2xl shadow-brand-primary/5 border border-brand-primary/5 relative"
              >
                <div className="flex justify-center gap-1 mb-6">
                  {[...Array(testimonials[current].rating)].map((_, i) => (
                    <Star key={i} size={16} fill="#D4AF37" color="#D4AF37" />
                  ))}
                </div>

                <p className="text-xl md:text-3xl font-bold text-brand-dark leading-relaxed mb-10">
                  "{testimonials[current].text}"
                </p>

                <div className="flex flex-col items-center">
                  <span className="font-black text-brand-primary text-lg">{testimonials[current].author}</span>
                  <span className="text-brand-muted text-sm uppercase tracking-widest">{testimonials[current].org}</span>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button 
              onClick={prev}
              className="absolute left-0 lg:-left-12 p-4 bg-white rounded-full shadow-lg text-brand-dark hover:bg-brand-primary hover:text-white transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={next}
              className="absolute right-0 lg:-right-12 p-4 bg-white rounded-full shadow-lg text-brand-dark hover:bg-brand-primary hover:text-white transition-all"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-3 mt-12">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`h-2 rounded-full transition-all ${current === idx ? 'w-8 bg-brand-primary' : 'w-2 bg-brand-primary/20'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsCarousel;
