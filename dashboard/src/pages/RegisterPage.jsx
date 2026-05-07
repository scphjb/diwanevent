import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Lock, 
  Mail,
  Shield, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Building
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

const RegisterPage = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'ar';
  const isRtl = currentLang === 'ar';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate registration
    setTimeout(() => {
      setLoading(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] -mr-40 -mt-40" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-secondary/5 rounded-full blur-[100px] -ml-20 -mb-20" />

      {/* Header */}
      <header className="relative z-10 py-8 px-6 lg:px-12">
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

      <main className="flex-grow relative z-10 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xl"
        >
          <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[48px] p-8 md:p-16 shadow-2xl relative overflow-hidden">
            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                      <Sparkles className="text-brand-secondary w-3 h-3" />
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Start Your Journey</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-4">{t('landing.auth.register.title')}</h1>
                    <p className="text-brand-muted text-sm">{t('landing.auth.register.subtitle')}</p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                          {t('landing.auth.register.fullname')}
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center text-white/20 group-focus-within:text-brand-primary">
                            <User size={18} />
                          </div>
                          <input 
                            type="text" 
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-brand-primary transition-all"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                          {t('landing.auth.register.username')}
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center text-white/20 group-focus-within:text-brand-primary">
                            <Mail size={18} />
                          </div>
                          <input 
                            type="text" 
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-brand-primary transition-all"
                            placeholder="john_admin"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                          {t('landing.auth.register.password')}
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center text-white/20 group-focus-within:text-brand-primary">
                            <Lock size={18} />
                          </div>
                          <input 
                            type="password" 
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-brand-primary transition-all"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                          {t('landing.auth.register.role')}
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center text-white/20 group-focus-within:text-brand-primary">
                            <ShieldCheck size={18} />
                          </div>
                          <select className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white/60 focus:outline-none focus:border-brand-primary transition-all appearance-none cursor-pointer">
                            <option value="admin">{t('landing.auth.register.role_admin')}</option>
                            <option value="scanner">{t('landing.auth.register.role_scanner')}</option>
                            <option value="viewer">{t('landing.auth.register.role_viewer')}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white h-20 rounded-2xl text-xl font-black shadow-2xl shadow-brand-primary/20 group flex items-center justify-center gap-4"
                    >
                      {loading ? (
                        <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          {t('landing.auth.register.submit')}
                          <ArrowRight className={cn("transition-transform group-hover:translate-x-1", isRtl ? "mr-2 rotate-180" : "ml-2")} size={24} />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-12 pt-8 border-t border-white/5 text-center">
                    <p className="text-sm text-brand-muted mb-4">
                      {t('landing.auth.register.have_account')}
                    </p>
                    <Link 
                      to="/login" 
                      className="text-white font-black text-sm uppercase tracking-widest hover:text-brand-secondary transition-colors"
                    >
                      {t('landing.auth.register.login_now')}
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-24 h-24 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto text-brand-primary mb-10 shadow-2xl">
                    <CheckCircle2 size={48} />
                  </div>
                  <h2 className="text-4xl font-black text-white mb-6">{t('landing.auth.register.success')}</h2>
                  <Link to="/login">
                    <Button className="bg-white text-brand-dark px-12 h-16 rounded-2xl text-lg font-black uppercase tracking-widest hover:bg-brand-secondary transition-colors">
                      {t('landing.auth.register.login_now')}
                    </Button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 py-8 px-6 text-center">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-white/20 text-[10px] font-black uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Shield size={14} />
            <span>SOC2 Type II Certified</span>
          </div>
          <div className="flex items-center gap-2">
            <Building size={14} />
            <span>Enterprise Grade Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RegisterPage;
