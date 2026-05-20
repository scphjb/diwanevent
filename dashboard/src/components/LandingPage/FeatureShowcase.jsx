import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { QrCode, CreditCard, BarChart3, CheckCircle2 } from 'lucide-react';

const FeatureShowcase = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const features = [
    {
      id: 0,
      title: isRtl ? "تسجيل الحضور الذكي" : "Smart Attendance",
      desc: isRtl ? "مسح لحظي عبر تقنية WebSocket مع استجابة 0 ثانية وتنبيهات فورية للمنظمين." : "Real-time scanning with WebSocket technology, 0s delay, and instant organizer alerts.",
      icon: QrCode,
      visual: (
        <div className="relative w-full h-full flex items-center justify-center bg-brand-dark/20 rounded-2xl border border-brand-primary/10 overflow-hidden">
          <div className="w-48 h-48 border-4 border-brand-primary/30 rounded-xl relative flex items-center justify-center">
            <QrCode className="w-32 h-32 text-brand-primary" />
            <motion.div 
              animate={{ top: ['10%', '90%', '10%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-brand-secondary shadow-[0_0_15px_rgba(212,175,55,0.8)] z-10"
            />
          </div>
          <div className="absolute bottom-4 left-4 right-4 bg-brand-primary/10 p-3 rounded-lg flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-white">
              <CheckCircle2 size={16} />
            </div>
            <div className="text-xs font-mono text-brand-primary">SCAN_SUCCESS: Ahmed Benali</div>
          </div>
        </div>
      )
    },
    {
      id: 1,
      title: isRtl ? "الشارات الرقمية" : "Digital Badges",
      desc: isRtl ? "توليد تلقائي للشارات بتصاميم احترافية تدعم اللغة العربية بالكامل RTL." : "Automated generation of professional badges with full RTL Arabic support.",
      icon: CreditCard,
      visual: (
        <div className="w-full h-full flex items-center justify-center">
          <motion.div 
            initial={{ rotateY: 0 }}
            animate={{ rotateY: 5 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
            className="w-64 h-96 bg-gradient-to-br from-brand-dark to-brand-primary/80 rounded-2xl shadow-2xl p-6 flex flex-col items-center border border-brand-secondary/30 relative"
          >
            <div className="w-full h-2 bg-brand-secondary absolute top-0 left-0 rounded-t-2xl" />
            <div className="w-20 h-20 bg-brand-light/10 rounded-full mb-6 border border-brand-secondary/20" />
            <div className="w-full space-y-4">
              <div className="h-4 bg-brand-secondary/20 rounded w-3/4 mx-auto" />
              <div className="h-6 bg-brand-secondary/40 rounded w-full mx-auto" />
              <div className="h-3 bg-brand-light/10 rounded w-1/2 mx-auto" />
            </div>
            <div className="mt-auto w-24 h-24 bg-white p-2 rounded-lg">
              <QrCode className="w-full h-full text-brand-dark" />
            </div>
          </motion.div>
        </div>
      )
    },
    {
      id: 2,
      title: isRtl ? "التحليلات الحية" : "Live Analytics",
      desc: isRtl ? "لوحة تحكم ذكية تعرض إحصائيات الحضور، الذروة، ونسب الوصول في الوقت الفعلي." : "Smart dashboard showing attendance stats, peaks, and reach percentages in real-time.",
      icon: BarChart3,
      visual: (
        <div className="w-full h-full p-8 flex flex-col">
          <div className="flex justify-between items-end h-64 gap-3">
            {[60, 80, 45, 90, 70, 100, 85].map((height, i) => (
              <motion.div 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: i * 0.1, duration: 1 }}
                className="flex-1 bg-brand-primary/20 rounded-t-lg relative group"
              >
                <div className="absolute inset-0 bg-brand-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg" />
              </motion.div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-[10px] text-brand-muted font-mono">
            <span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span>
          </div>
        </div>
      )
    }
  ];

  return (
    <section className="py-24 bg-brand-light relative overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-brand-dark mb-4">
            {isRtl ? "تقنية مخصصة لأدق التفاصيل" : "Tech Tailored to Perfection"}
          </h2>
          <p className="text-brand-muted max-w-2xl mx-auto">
            {isRtl ? "نحن ندمج السرعة بالاستقرار لتقديم تجربة تنظيمية لا مثيل لها." : "We merge speed with stability to provide an unparalleled organizing experience."}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Tabs List */}
          <div className="lg:col-span-5 space-y-4">
            {features.map((feature, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`w-full p-6 rounded-2xl flex items-start gap-5 transition-all duration-300 text-start ${
                  activeTab === idx 
                  ? 'bg-white shadow-xl shadow-brand-primary/5 border-s-4 border-brand-primary' 
                  : 'hover:bg-brand-primary/5 grayscale opacity-60'
                }`}
              >
                <div className={`p-3 rounded-xl ${activeTab === idx ? 'bg-brand-primary text-white' : 'bg-brand-dark/10 text-brand-dark'}`}>
                  <feature.icon size={24} />
                </div>
                <div>
                  <h3 className={`text-xl font-bold mb-1 ${activeTab === idx ? 'text-brand-primary' : 'text-brand-dark'}`}>
                    {feature.title}
                  </h3>
                  <p className="text-sm text-brand-muted leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Visual Display */}
          <div className="lg:col-span-7 h-[500px] bg-white rounded-3xl shadow-inner border border-brand-primary/5 p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full h-full"
              >
                {features[activeTab].visual}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
