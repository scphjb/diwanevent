import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Clock, AlertCircle, FileBarChart, XCircle, CheckCircle2 } from 'lucide-react';

const ProblemSection = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const cards = [
    {
      title: isRtl ? "الوقت" : "Time",
      before: isRtl ? "3 ساعات لتسجيل الحضور يدوياً" : "3 hours of manual registration",
      after: isRtl ? "40 دقيقة لـ 1,200 مشارك مع QR" : "40 mins for 1,200 with QR",
      icon: Clock,
    },
    {
      title: isRtl ? "الأخطاء" : "Errors",
      before: isRtl ? "أسماء مكررة، قوائم مفقودة، فوضى" : "Duplicates, lost lists, chaos",
      after: isRtl ? "صفر أخطاء — كل مشارك برمز فريد" : "Zero errors — unique codes",
      icon: AlertCircle,
    },
    {
      title: isRtl ? "التقارير" : "Reports",
      before: isRtl ? "أيام لجمع بيانات الحضور" : "Days to collect attendance data",
      after: isRtl ? "تقرير PDF كامل بنقرة واحدة" : "Instant PDF report in one click",
      icon: FileBarChart,
    }
  ];

  return (
    <section className="py-24 bg-brand-dark noise-bg overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-brand-text mb-6">
            {isRtl ? "التنظيم التقليدي يكلّفك أكثر مما تتخيل" : "Traditional Organizing Costs More Than You Think"}
          </h2>
          <p className="text-brand-muted max-w-2xl mx-auto">
            {isRtl ? "لماذا تستمر في استخدام الورق والعد اليدوي بينما يمكنك الانتقال للعصر الرقمي؟" : "Why keep using paper and manual counting when you can go digital?"}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="glass-card rounded-[2rem] p-8 group overflow-hidden"
            >
              <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-secondary mb-8 group-hover:scale-110 transition-transform">
                <card.icon size={32} />
              </div>

              <h3 className="text-2xl font-bold text-brand-text mb-8">{card.title}</h3>

              <div className="space-y-6">
                <div className="flex gap-4 p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                  <XCircle size={20} className="text-red-500 flex-shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase text-red-500 font-bold mb-1">{isRtl ? 'سابقاً' : 'Before'}</div>
                    <div className="text-sm text-brand-muted">{card.before}</div>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-brand-primary/10 rounded-2xl border border-brand-primary/20">
                  <CheckCircle2 size={20} className="text-brand-primary flex-shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase text-brand-primary font-bold mb-1">{isRtl ? 'مع ديوان' : 'With Diwan'}</div>
                    <div className="text-sm text-brand-text font-bold">{card.after}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
