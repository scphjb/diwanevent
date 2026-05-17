/**
 * ParticipantLoginPage — صفحة تسجيل دخول المشاركين عبر OTP
 * المسار: /portal/login أو /participant-login
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, KeyRound, ArrowLeft, RefreshCw, ShieldCheck, LogIn } from 'lucide-react';
import axios from 'axios';

const API = axios.create({ baseURL: '/api/v1/participant-auth' });

const InputField = ({ icon: Icon, ...props }) => (
  <div style={{ position: 'relative' }}>
    <Icon
      size={16}
      style={{
        position: 'absolute', top: '50%', right: 14,
        transform: 'translateY(-50%)', color: 'rgba(212,175,55,0.6)',
        pointerEvents: 'none',
      }}
    />
    <input
      {...props}
      style={{
        width: '100%', padding: '12px 42px 12px 14px', borderRadius: 10,
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
        color: '#F0F4F2', fontSize: 14, fontFamily: 'Cairo, sans-serif',
        outline: 'none', direction: 'rtl', boxSizing: 'border-box',
        transition: 'border-color 0.2s',
        ...props.style,
      }}
      onFocus={e => e.target.style.borderColor = '#D4AF37'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
    />
  </div>
);

const OTPInput = ({ value, onChange }) => {
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleInput = (i, e) => {
    const val = e.target.value.slice(-1); // خذ آخر حرف تم إدخاله
    if (!/^\d$/.test(val)) return;

    const newDigits = [...digits];
    newDigits[i] = val;
    const newVal = newDigits.join('').slice(0, 6);
    onChange(newVal);

    // الانتقال للخانة التالية
    if (i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (!digits[i] && i > 0) {
        document.getElementById(`otp-${i - 1}`)?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[i] = '';
        onChange(newDigits.join(''));
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(data)) {
      onChange(data);
      document.getElementById('otp-5')?.focus();
    }
  };

  return (
    <div 
      style={{ display: 'flex', gap: 8, justifyContent: 'center', direction: 'ltr' }}
      onPaste={handlePaste}
    >
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={digits[i] || ''}
          onKeyDown={e => handleKeyDown(i, e)}
          onInput={e => handleInput(i, e)}
          onChange={() => {}} // يتم التعامل عبر onInput
          style={{
            width: 48, height: 56, textAlign: 'center', fontSize: 24,
            fontWeight: '900', fontFamily: 'monospace', borderRadius: 10,
            background: digits[i] ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
            border: `2px solid ${digits[i] ? '#D4AF37' : 'rgba(255,255,255,0.12)'}`,
            color: '#D4AF37', outline: 'none', cursor: 'text',
            transition: 'all 0.15s',
          }}
          onFocus={e => e.select()} // تحديد النص عند التركيز لتسهيل المسح
        />
      ))}
    </div>
  );
};

export default function ParticipantLoginPage() {
  const [step, setStep] = useState(1); // 1=الإدخال، 2=OTP
  const [orderNum, setOrderNum] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [participant, setParticipant] = useState(null);

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  };

  // 🔗 Magic Link Handler
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      const autoLogin = async () => {
        setLoading(true);
        setError('');
        try {
          // 1. تجربة التوكن عبر جلب بيانات "أنا"
          const res = await API.get('/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // 2. إذا نجح، نخزن البيانات
          localStorage.setItem('participant_token', token);
          localStorage.setItem('participant_data', JSON.stringify(res.data));
          setParticipant(res.data);
          setStep(3);
          
          // تنظيف الرابط
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          setError('رابط الدخول السريع غير صالح أو منتهي الصلاحية');
        } finally {
          setLoading(false);
        }
      };
      autoLogin();
    } else {
      // 📝 التحقق من وجود بيانات (رقم الطلب + الإيميل) قادمة من صفحة التسجيل
      const oNum = urlParams.get('order_num');
      const mail = urlParams.get('email');
      if (oNum && mail) {
        setOrderNum(oNum);
        setEmail(mail);
        setStep(2); // الانتقال مباشرة لخانة الـ OTP
        setSuccessMsg('تم إرسال رمز التحقق إلى بريدك الإلكتروني. يرجى إدخاله أدناه.');
        startCountdown();
        // تنظيف الرابط
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await API.post('/request-otp', { order_num: orderNum.trim(), email: email.trim() });
      setSuccessMsg(res.data.message || 'تم إرسال الرمز');
      // بيئة التطوير: عرض الرمز مباشرة
      if (res.data.dev_otp) {
        setOtp(res.data.dev_otp);
        setSuccessMsg(`[DEV] الرمز: ${res.data.dev_otp}`);
      }
      setStep(2);
      startCountdown();
    } catch (err) {
      setError(err.response?.data?.detail || 'حدث خطأ. حاول مرة أخرى');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length < 6) { setError('أدخل الرمز المكون من 6 أرقام'); return; }
    setError(''); setLoading(true);
    try {
      const res = await API.post('/verify-otp', {
        order_num: orderNum.trim(),
        email: email.trim(),
        otp_code: otp.trim(),
      });
      localStorage.setItem('participant_token', res.data.access_token);
      localStorage.setItem('participant_data', JSON.stringify(res.data.participant));
      setParticipant(res.data.participant);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'رمز التحقق غير صحيح');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError(''); setLoading(true);
    try {
      await API.post('/request-otp', { order_num: orderNum, email });
      setSuccessMsg('تم إعادة إرسال الرمز');
      startCountdown();
    } catch (err) {
      setError(err.response?.data?.detail || 'فشل إعادة الإرسال');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#022C22', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Cairo, sans-serif', direction: 'rtl', padding: 20,
      backgroundImage: 'radial-gradient(ellipse at 70% 20%, rgba(26,138,106,0.12) 0%, transparent 60%)',
    }}>
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          background: 'rgba(10,61,43,0.9)', border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 24, padding: '40px 36px', width: '100%', maxWidth: 420,
          backdropFilter: 'blur(20px)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4AF37, #B8960C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(212,175,55,0.3)',
          }}>
            {step === 1 ? <LogIn size={28} color="#022C22" /> :
             step === 2 ? <KeyRound size={28} color="#022C22" /> :
             <ShieldCheck size={28} color="#022C22" />}
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: '900', color: '#F0F4F2' }}>
            {step === 1 ? 'دخول المشاركين' : step === 2 ? 'التحقق من الهوية' : 'مرحباً بك! 🎉'}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(240,244,242,0.55)' }}>
            {step === 1 ? 'أدخل رقمك وبريدك للمتابعة' :
             step === 2 ? `تم إرسال رمز تحقق إلى ${email}` :
             'تم التحقق من هويتك بنجاح'}
          </p>
        </div>

        {/* Step 1: Request OTP */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#D4AF37', display: 'block', marginBottom: 6 }}>رقم المشارك</label>
              <InputField
                icon={ShieldCheck}
                type="text"
                placeholder="DWN-0001"
                value={orderNum}
                onChange={e => setOrderNum(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#D4AF37', display: 'block', marginBottom: 6 }}>البريد الإلكتروني المسجل</label>
              <InputField
                icon={Mail}
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13 }}>
                {error}
              </div>
            )}
            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{
                marginTop: 4, padding: '13px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #D4AF37, #B8960C)',
                color: '#022C22', fontWeight: '900', fontSize: 15,
                fontFamily: 'Cairo, sans-serif', cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق ✉️'}
            </motion.button>
          </form>
        )}

        {/* Step 2: Enter OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {successMsg && (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', color: '#6ee7b7', fontSize: 13, textAlign: 'center' }}>
                {successMsg}
              </div>
            )}
            <OTPInput value={otp} onChange={setOtp} />
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, textAlign: 'center' }}>
                {error}
              </div>
            )}
            <motion.button
              type="submit" disabled={loading || otp.length < 6}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{
                padding: '13px', borderRadius: 10, border: 'none',
                background: otp.length === 6 ? 'linear-gradient(135deg, #D4AF37, #B8960C)' : 'rgba(212,175,55,0.2)',
                color: otp.length === 6 ? '#022C22' : 'rgba(212,175,55,0.5)',
                fontWeight: '900', fontSize: 15, fontFamily: 'Cairo, sans-serif',
                cursor: otp.length === 6 ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
              }}
            >
              {loading ? 'جاري التحقق...' : 'تحقق من الرمز 🔓'}
            </motion.button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button" onClick={() => { setStep(1); setOtp(''); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(240,244,242,0.4)', cursor: 'pointer', fontSize: 13, fontFamily: 'Cairo', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <ArrowLeft size={13} /> تغيير البيانات
              </button>
              <button
                type="button" onClick={handleResend} disabled={countdown > 0}
                style={{
                  background: 'none', border: 'none', cursor: countdown > 0 ? 'default' : 'pointer',
                  color: countdown > 0 ? 'rgba(212,175,55,0.3)' : '#D4AF37',
                  fontSize: 13, fontFamily: 'Cairo', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <RefreshCw size={13} />
                {countdown > 0 ? `إعادة الإرسال بعد ${countdown}ث` : 'إعادة الإرسال'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success */}
        {step === 3 && participant && (
          <div style={{ textAlign: 'center' }}>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              style={{ fontSize: 64, marginBottom: 16 }}
            >
              🎊
            </motion.div>
            <div style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12, padding: 16, marginBottom: 20, textAlign: 'right' }}>
              <p style={{ margin: '0 0 6px', color: '#D4AF37', fontSize: 13, fontWeight: 'bold' }}>بياناتك</p>
              <p style={{ margin: '4px 0', color: '#F0F4F2', fontSize: 15, fontWeight: 'bold' }}>{participant.full_name}</p>
              <p style={{ margin: '4px 0', color: 'rgba(240,244,242,0.55)', fontSize: 13 }}>{participant.role} — {participant.council}</p>
              <p style={{ margin: '4px 0', color: 'rgba(240,244,242,0.4)', fontSize: 12 }}>#{participant.order_num}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => {
                const token = localStorage.getItem('participant_token');
                window.location.href = `/p/${participant.event_id}/${token}`;
              }}
              style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #D4AF37, #B8960C)',
                color: '#022C22', fontWeight: '900', fontSize: 15,
                fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
              }}
            >
              الدخول إلى البوابة ←
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
