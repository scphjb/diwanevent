import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Lock, 
  ArrowRight, 
  Sparkles,
  ArrowLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

const Login = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'ar';
  const isRtl = currentLang === 'ar';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // التحويل لنموذج FormData لأن FastAPI يستخدم OAuth2PasswordRequestForm
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to login');
      }

      // حفظ التوكن وبيانات المستخدم
      localStorage.setItem('diwan_token', data.access_token);
      localStorage.setItem('diwan_refresh_token', data.refresh_token);
      localStorage.setItem('diwan_user', JSON.stringify(data.user));

      // التوجيه بناءً على الرتبة
      if (data.user.role === 'super_admin') {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(currentLang === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] -ml-40 -mt-40" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-brand-secondary/5 rounded-full blur-[100px] -mr-20 -mb-20" />

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
          className="w-full max-w-md"
        >
          <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            {/* Inner glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />

            <div className="relative z-10 text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                <ShieldCheck className="text-brand-secondary w-3 h-3" />
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Secure Access</span>
              </div>
              <h1 className="text-4xl font-black text-white mb-3">{t('landing.auth.login.title')}</h1>
              <p className="text-brand-muted text-sm">{t('landing.auth.login.subtitle')}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                  {t('landing.auth.login.username')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-white/20 group-focus-within:text-brand-primary transition-colors">
                    <User size={18} />
                  </div>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-brand-primary transition-all"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                    {t('landing.auth.login.password')}
                  </label>
                  <Link to="/forgot-password" className="text-[10px] font-black text-brand-secondary uppercase tracking-widest hover:underline">
                    نسيت كلمة المرور؟
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-white/20 group-focus-within:text-brand-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-brand-primary transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white h-16 rounded-2xl text-lg font-black shadow-xl shadow-brand-primary/20 group flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {t('landing.auth.login.submit')}
                    <ArrowRight className={cn("transition-transform group-hover:translate-x-1", isRtl ? "mr-2 rotate-180" : "ml-2")} size={20} />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-sm text-brand-muted mb-4">
                {t('landing.auth.login.no_account')}
              </p>
              <Link 
                to="/signup" 
                className="inline-flex items-center gap-2 text-white font-black text-sm uppercase tracking-widest hover:text-brand-secondary transition-colors group"
              >
                <span>إنشاء حساب منظم</span>
                <Sparkles size={16} className="text-brand-secondary" />
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer Meta */}
      <footer className="relative z-10 py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-3 text-white/20 text-[10px] font-black uppercase tracking-widest">
          <ShieldCheck size={14} />
          <span>Encrypted Session • SOC2 Compliance • ISO 27001</span>
        </div>
      </footer>
    </div>
  );
};

export default Login;
