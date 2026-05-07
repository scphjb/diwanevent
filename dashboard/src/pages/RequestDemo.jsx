import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  ArrowRight, 
  CheckCircle2, 
  Globe, 
  Shield, 
  Zap, 
  MessageSquare,
  Sparkles,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

const RequestDemo = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'ar';
  const isRtl = currentLang === 'ar';
  const [isSubmitted, setIsSubmitted] = useState(false);

  const benefits = [
    t('landing.request_demo.f1'),
    t('landing.request_demo.f2'),
    t('landing.request_demo.f3'),
    t('landing.request_demo.f4')
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-brand-dark overflow-hidden flex flex-col">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-primary/10 rounded-full blur-[150px] -mr-40 -mt-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-secondary/5 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 py-8 px-6 lg:px-12 border-b border-white/5 bg-brand-dark/50 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
              <span className="text-white font-black text-xl">D</span>
            </div>
            <span className="text-white font-black text-xl tracking-tight uppercase">Diwan <span className="text-brand-secondary">Event</span></span>
          </Link>
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors font-bold text-sm uppercase tracking-widest">
            {isRtl ? <ChevronRight size={16} /> : <ArrowLeft size={16} />}
            <span>{isRtl ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </Link>
        </div>
      </header>

      <main className="flex-grow relative z-10 container mx-auto px-6 py-12 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-20 items-center max-w-7xl mx-auto">
          
          {/* Content Side */}
          <div className="space-y-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10"
            >
              <Sparkles className="text-brand-secondary w-4 h-4" />
              <span className="text-brand-secondary text-[10px] font-black uppercase tracking-[0.2em]">
                {t('landing.request_demo.badge')}
              </span>
            </motion.div>

            <div className="space-y-6">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl lg:text-7xl font-black text-white leading-tight"
              >
                {t('landing.request_demo.title')}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-brand-muted text-xl leading-relaxed max-w-xl"
              >
                {t('landing.request_demo.sub')}
              </motion.p>
            </div>

            <div className="space-y-6">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-white font-medium">{benefit}</span>
                </motion.div>
              ))}
            </div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="pt-10 border-t border-white/5 flex items-center gap-10 opacity-40"
            >
              <div className="flex items-center gap-2">
                <Shield size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">SOC2</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">Real-time</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">Global</span>
              </div>
            </motion.div>
          </div>

          {/* Form Side */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl">
              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black text-white">{t('landing.request_demo.form.title')}</h2>
                      <p className="text-brand-muted text-sm">{t('landing.request_demo.form.subtitle')}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-white/40 uppercase tracking-widest ml-1">
                          {t('landing.request_demo.form.name')}
                        </label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-primary transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-white/40 uppercase tracking-widest ml-1">
                          {t('landing.request_demo.form.email')}
                        </label>
                        <input 
                          type="email" 
                          required
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-primary transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-white/40 uppercase tracking-widest ml-1">
                          {t('landing.request_demo.form.company')}
                        </label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-primary transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-white/40 uppercase tracking-widest ml-1">
                          {t('landing.request_demo.form.size')}
                        </label>
                        <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white/60 focus:outline-none focus:border-brand-primary transition-all appearance-none">
                          <option value="100">100 - 500</option>
                          <option value="1000">500 - 2,000</option>
                          <option value="5000">2,000 - 10,000</option>
                          <option value="over">10,000+</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-white/40 uppercase tracking-widest ml-1">
                        {t('landing.request_demo.form.message')}
                      </label>
                      <textarea 
                        rows="4"
                        placeholder={t('landing.request_demo.form.placeholder_message')}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-primary transition-all resize-none"
                      />
                    </div>

                    <Button type="submit" className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white h-16 rounded-2xl text-lg font-black shadow-xl shadow-brand-primary/20 group">
                      {t('landing.request_demo.form.submit')}
                      <ArrowRight className={cn("transition-transform group-hover:translate-x-1", isRtl ? "mr-2 rotate-180" : "ml-2")} />
                    </Button>

                    <p className="text-center text-[10px] text-white/20 font-medium leading-relaxed">
                      {t('landing.request_demo.form.privacy')}
                    </p>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-20 space-y-8"
                  >
                    <div className="w-24 h-24 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto text-brand-primary mb-6">
                      <CheckCircle2 size={48} />
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-4xl font-black text-white">{t('landing.request_demo.form.success_title')}</h2>
                      <p className="text-brand-muted text-lg max-w-sm mx-auto">
                        {t('landing.request_demo.form.success_msg')}
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsSubmitted(false)}
                      className="text-brand-secondary font-black text-sm uppercase tracking-widest hover:underline"
                    >
                      {t('landing.request_demo.form.another')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 py-8 px-6 text-center border-t border-white/5">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-white/20 text-[10px] font-black uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} />
            <span>Support: support@diwanevent.com</span>
          </div>
          <div className="hidden md:block w-1 h-1 rounded-full bg-white/10" />
          <div className="flex items-center gap-2">
            <Globe size={14} />
            <span>Global Coverage: 40+ Countries</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RequestDemo;
