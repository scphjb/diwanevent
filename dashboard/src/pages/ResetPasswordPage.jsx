import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('كلمة المرور غير متطابقة'); return; }
    if (password.length < 8) { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'حدث خطأ');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-black text-white mb-4">رابط غير صالح</h2>
          <p className="text-brand-muted mb-6">لا يوجد توكن في الرابط — يرجى طلب رابط جديد</p>
          <Link to="/forgot-password" className="text-brand-secondary font-bold hover:underline">طلب رابط جديد</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] -ml-40 -mt-40" />

      <header className="relative z-10 py-8 px-6 lg:px-12">
        <div className="container mx-auto">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
              <span className="text-white font-black text-xl">D</span>
            </div>
            <span className="text-white font-black text-xl tracking-tight uppercase">Diwan <span className="text-brand-secondary">Event</span></span>
          </Link>
        </div>
      </header>

      <main className="flex-grow relative z-10 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            {success ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="text-emerald-400 w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-white mb-3">تم تغيير كلمة المرور</h2>
                <p className="text-brand-muted text-sm">سيتم توجيهك لتسجيل الدخول خلال ثوانٍ...</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                    <ShieldCheck className="text-brand-secondary w-3 h-3" />
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Reset Password</span>
                  </div>
                  <h1 className="text-3xl font-black text-white mb-3">كلمة مرور جديدة</h1>
                  <p className="text-brand-muted text-sm">أدخل كلمة المرور الجديدة</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {[{ val: password, set: setPassword, label: 'كلمة المرور الجديدة' }, { val: confirm, set: setConfirm, label: 'تأكيد كلمة المرور' }].map((f, i) => (
                    <div key={i} className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">{f.label}</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-white/20 group-focus-within:text-brand-primary transition-colors">
                          <Lock size={18} />
                        </div>
                        <input type="password" required value={f.val} onChange={(e) => f.set(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-brand-primary transition-all"
                          placeholder="••••••••" />
                      </div>
                    </div>
                  ))}

                  {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center">{error}</div>
                  )}

                  <Button type="submit" disabled={loading}
                    className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white h-16 rounded-2xl text-lg font-black shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-3">
                    {loading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <>تغيير كلمة المرور <ArrowRight className="mr-2 rotate-180" size={20} /></>}
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

export default ResetPasswordPage;
