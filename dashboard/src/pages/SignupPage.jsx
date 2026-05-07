import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Mail, Building2, ArrowRight, ShieldCheck, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const SignupPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '', organization_name: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm_password) {
      setError('كلمة المرور غير متطابقة');
      return;
    }
    if (form.password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          organization_name: form.organization_name,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'حدث خطأ أثناء التسجيل');

      localStorage.setItem('diwan_token', data.access_token);
      localStorage.setItem('diwan_refresh_token', data.refresh_token);
      localStorage.setItem('diwan_user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'full_name', label: 'الاسم الكامل', icon: User, type: 'text', placeholder: 'محمد أحمد', required: true },
    { name: 'email', label: 'البريد الإلكتروني', icon: Mail, type: 'email', placeholder: 'you@company.com', required: true },
    { name: 'organization_name', label: 'اسم المؤسسة (اختياري)', icon: Building2, type: 'text', placeholder: 'شركتك أو مؤسستك' },
    { name: 'password', label: 'كلمة المرور', icon: Lock, type: 'password', placeholder: '••••••••', required: true },
    { name: 'confirm_password', label: 'تأكيد كلمة المرور', icon: Lock, type: 'password', placeholder: '••••••••', required: true },
  ];

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] -ml-40 -mt-40" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] -mr-20 -mb-20" />

      <header className="relative z-10 py-8 px-6 lg:px-12">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
              <span className="text-white font-black text-xl">D</span>
            </div>
            <span className="text-white font-black text-xl tracking-tight uppercase">Diwan <span className="text-brand-secondary">Event</span></span>
          </Link>
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors font-bold text-sm uppercase tracking-widest">
            <ChevronRight size={16} />
            <span>العودة للرئيسية</span>
          </Link>
        </div>
      </header>

      <main className="flex-grow relative z-10 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16" />

            <div className="relative z-10 text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
                <ShieldCheck className="text-brand-secondary w-3 h-3" />
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Create Account</span>
              </div>
              <h1 className="text-3xl font-black text-white mb-2">إنشاء حساب منظم</h1>
              <p className="text-brand-muted text-sm">ابدأ بإدارة فعالياتك باحترافية</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map(f => (
                <div key={f.name} className="space-y-1">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">{f.label}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-brand-primary transition-colors">
                      <f.icon size={16} />
                    </div>
                    <input
                      type={f.type} name={f.name} required={f.required}
                      value={form[f.name]} onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-primary transition-all"
                      placeholder={f.placeholder}
                    />
                  </div>
                </div>
              ))}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center">{error}</div>
              )}

              <Button type="submit" disabled={loading}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white h-14 rounded-2xl text-base font-black shadow-xl shadow-brand-primary/20 group flex items-center justify-center gap-3 mt-2">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>إنشاء الحساب <ArrowRight className="mr-2 rotate-180" size={18} /></>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <p className="text-sm text-brand-muted">لديك حساب بالفعل؟{' '}
                <Link to="/login" className="text-white font-black hover:text-brand-secondary transition-colors">تسجيل الدخول</Link>
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default SignupPage;
