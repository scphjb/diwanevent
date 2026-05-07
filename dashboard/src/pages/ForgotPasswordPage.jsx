import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ShieldCheck, ChevronRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('حدث خطأ');
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] -ml-40 -mt-40" />

      <header className="relative z-10 py-8 px-6 lg:px-12">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
              <span className="text-white font-black text-xl">D</span>
            </div>
            <span className="text-white font-black text-xl tracking-tight uppercase">Diwan <span className="text-brand-secondary">Event</span></span>
          </Link>
          <Link to="/login" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors font-bold text-sm uppercase tracking-widest">
            <ChevronRight size={16} />
            <span>العودة لتسجيل الدخول</span>
          </Link>
        </div>
      </header>

      <main className="flex-grow relative z-10 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16" />

            {sent ? (
              <div className="relative z-10 text-center py-8">
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="text-emerald-400 w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-white mb-3">تم الإرسال بنجاح</h2>
                <p className="text-brand-muted text-sm leading-relaxed">
                  إذا كان البريد الإلكتروني مسجلاً في المنصة، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور.
                </p>
                <Link to="/login" className="inline-flex items-center gap-2 mt-8 text-white font-black text-sm uppercase tracking-widest hover:text-brand-secondary transition-colors">
                  العودة لتسجيل الدخول
                </Link>
              </div>
            ) : (
              <>
                <div className="relative z-10 text-center mb-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                    <ShieldCheck className="text-brand-secondary w-3 h-3" />
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Password Recovery</span>
                  </div>
                  <h1 className="text-3xl font-black text-white mb-3">نسيت كلمة المرور؟</h1>
                  <p className="text-brand-muted text-sm">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">البريد الإلكتروني</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-white/20 group-focus-within:text-brand-primary transition-colors">
                        <Mail size={18} />
                      </div>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-brand-primary transition-all"
                        placeholder="you@company.com" />
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center">{error}</div>
                  )}

                  <Button type="submit" disabled={loading}
                    className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white h-16 rounded-2xl text-lg font-black shadow-xl shadow-brand-primary/20 group flex items-center justify-center gap-3">
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>إرسال رابط الاستعادة <ArrowRight className="mr-2 rotate-180" size={20} /></>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;
