import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Building, CreditCard, CheckCircle2, ArrowRight,
  ShieldCheck, Calendar, MapPin, Ticket, Sparkles, Phone, Hash, Info,
  UserCheck, Star, Mic, Newspaper, ChevronDown
} from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/Button';

const safeFormatDate = (dateString) => {
  try {
    if (!dateString) return 'سيتم التحديد لاحقاً';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'سيتم التحديد لاحقاً';
    return date.toLocaleDateString('ar-DZ', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      numberingSystem: 'latn'
    });
  } catch (e) { return 'سيتم التحديد لاحقاً'; }
};

const getFullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  
  let baseApi = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1/';
  if (!import.meta.env.DEV && (!import.meta.env.VITE_API_URL || baseApi.includes('localhost'))) {
    baseApi = window.location.origin + '/api/v1/';
  }
  const baseUrl = baseApi.replace('/api/v1/', '');
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanUrl = url.startsWith('/') ? url : '/' + url;
  return `${cleanBase}${cleanUrl}`;
};

const PARTICIPANT_ROLES = [
  { value: 'attendee',  label: 'مشارك',          icon: '👤', desc: 'تصفح البوابة التفاعلية وحضور الجلسات' },
  { value: 'press',     label: 'صحافة وإعلام',    icon: '📰', desc: 'تغطية إعلامية (شارة دخول فقط)' },
  { value: 'exhibitor', label: 'عارض / جناح',     icon: '🎪', desc: 'جناح عارض (شارة دخول فقط)' },
];

const AttendeeRegistrationPage = () => {
  const { eid } = useParams();
  const eventId = eid || 1;
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'success' | 'otp_sent'
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    organization: '',
    department: '',
    professional_address: '',
    role: 'attendee',
  });
  const [customValues, setCustomValues] = useState({});
  const [error, setError] = useState(null);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online'); // 'online' | 'transfer'

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ─── نستخدم الـ endpoint العام — لا يتطلب تسجيل دخول ───
        const eventRes = await api.get(`events/public/${eventId}`);
        const eventData = eventRes.data;
        setEvent(eventData);

        // نجلب حقول التسجيل فقط إذا كان التسجيل مفتوحاً
        if (eventData.registration_enabled) {
          const fieldsRes = await api.get(`events/${eventId}/registration-fields`).catch(() => ({ data: [] }));
          setCustomFields(fieldsRes.data);
          const initialCustom = {};
          // تعبئة القيم الافتراضية تلقائياً
          fieldsRes.data.forEach(f => { initialCustom[f.field_name] = f.default_value || ''; });
          setCustomValues(initialCustom);
        }
      } catch (err) {
        setError('تعذر جلب بيانات الفعالية.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // التحقق من تفعيل التحقق من البريد الإلكتروني بـ OTP
    if (event.verify_email_on_register && !showOtpVerification) {
      if (!formData.email) {
        setError('البريد الإلكتروني مطلوب لتلقي رمز التحقق وإكمال التسجيل.');
        return;
      }
      setSendingOtp(true);
      try {
        await api.post('participants/public/send-verification-otp', {
          email: formData.email,
          event_id: parseInt(eventId)
        });
        setShowOtpVerification(true);
      } catch (err) {
        setError(err.response?.data?.detail || 'فشل إرسال رمز التحقق للبريد الإلكتروني.');
      } finally {
        setSendingOtp(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      // 1. تسجيل المشارك
      const regResponse = await api.post(`participants/public/register`, {
        event_id: parseInt(eventId),
        full_name: formData.full_name,
        email: formData.email,
        organization: formData.organization,
        phone_number: formData.phone_number,
        department: formData.department || null,
        verification_code: event.verify_email_on_register ? verificationCode : null,
        payment_method: paymentMethod,
        custom_values: { ...customValues, role: formData.role, professional_address: formData.professional_address }
      });

      const result = regResponse.data;
      setRegistrationResult(result);

      // 2. منطق الدفع
      if (event.require_payment && event.ticket_price > 0) {
        // الحوالة البنكية — تسجيل بحالة مقيدة
        if (paymentMethod === 'transfer' && event.allow_transfer_payment) {
          setStep('transfer_registered');
          return;
        }
        // الدفع الإلكتروني
        if (event.payment_gateway && event.payment_gateway !== 'none') {
          const payResponse = await api.post('payments/create-session', {
            event_id: parseInt(eventId),
            participant_id: result.participant_id,
            success_url: `${window.location.origin}/p/${eventId}/${result.participant_id}?status=paid`,
            cancel_url: window.location.href
          });
          if (payResponse.data.checkout_url) {
            window.location.href = payResponse.data.checkout_url;
            return;
          }
        }
      }

      if (result.merged) {
        setStep(formData.email ? 'otp_sent' : 'success');
      } else {
        setStep('pending_approval');
      }

    } catch (err) {
      setError(err.response?.data?.detail || 'حدث خطأ أثناء التسجيل.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRole = PARTICIPANT_ROLES.find(r => r.value === formData.role) || PARTICIPANT_ROLES[0];

  if (loading) return (
    <div className="min-h-screen bg-[#050B18] flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!event) return (
    <div className="min-h-screen bg-[#050B18] flex items-center justify-center text-white">
      <p>تعذر تحميل بيانات الفعالية</p>
    </div>
  );

  // ─── شاشة الانتظار للموافقة ─────────────────────────────────────────
  if (step === 'pending_approval') {
    return (
      <div className="min-h-screen bg-[#050B18] flex items-center justify-center p-6" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 border border-white/10 rounded-[40px] p-12 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="text-6xl mb-6"
          >
            ⏳
          </motion.div>
          <h1 className="text-3xl font-black text-white mb-3">
            طلبك قيد المراجعة
          </h1>
          <p className="text-brand-secondary/60 mb-8 text-sm leading-relaxed">
            تم استلام طلب التسجيل الخاص بك بنجاح! طلبك الآن قيد المراجعة والتدقيق من قبل إدارة تنظيم الفعالية. ستصلك رسالة تأكيد تحتوي على رابط تذكرة الدخول والرمز السري على بريدك الإلكتروني بمجرد الموافقة على الطلب.
          </p>

          {registrationResult && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-8 text-right">
              <p className="text-amber-500/60 text-xs font-bold uppercase tracking-widest mb-2">رقم التسجيل المرجعي</p>
              <p className="text-4xl font-black text-amber-400 tracking-widest font-mono">{registrationResult.order_num}</p>
              <p className="text-white/40 text-sm mt-2">يرجى الاحتفاظ بهذا الرقم كمرجع لطلبك</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              className="w-full h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/10"
              onClick={() => navigate('/')}
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── شاشة الحوالة البنكية ─────────────────────────────────────────
  if (step === 'transfer_registered') {
    return (
      <div className="min-h-screen bg-[#050B18] flex items-center justify-center p-6" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 border border-white/10 rounded-[40px] p-10 max-w-lg w-full text-center"
        >
          <div className="text-6xl mb-5">🏦</div>
          <h1 className="text-3xl font-black text-white mb-2">أكمل عملية التسديد</h1>
          <p className="text-brand-secondary/60 mb-6 text-sm leading-relaxed">
            تم استلام طلب تسجيلك. يرجى تحويل مبلغ الاشتراك إلى الحساب أدناه ثم رفع صورة وصل التحويل من بوابتك.
          </p>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 mb-6 text-right space-y-3">
            {event.bank_name && (
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">البنك</span>
                <span className="font-bold text-white">{event.bank_name}</span>
              </div>
            )}
            {event.bank_account_name && (
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">اسم الحساب</span>
                <span className="font-bold text-white">{event.bank_account_name}</span>
              </div>
            )}
            {event.bank_account_number && (
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">رقم الحساب (RIB)</span>
                <span className="font-black text-amber-400 font-mono text-sm tracking-widest">{event.bank_account_number}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-white/10 pt-3">
              <span className="text-white/40 text-sm">المبلغ</span>
              <span className="font-black text-amber-400 text-xl">{event.ticket_price} {event.currency || 'DZD'}</span>
            </div>
          </div>

          {event.bank_instructions && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6 text-right">
              <p className="text-blue-300/80 text-sm leading-relaxed">💡 {event.bank_instructions}</p>
            </div>
          )}

          {registrationResult && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
              <p className="text-white/40 text-xs mb-1">رقم مشاركتك (اذكره في وصل التحويل)</p>
              <p className="font-mono font-black text-white text-2xl tracking-widest">{registrationResult.order_num}</p>
            </div>
          )}

          <p className="text-white/40 text-xs mb-6">
            بعد التحويل، سجّل دخولك للبوابة برقمك وارفع صورة الوصل. سيتم مراجعتها وتفعيل حسابك خلال 24 ساعة.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/10"
          >
            العودة للصفحة الرئيسية
          </button>
        </motion.div>
      </div>
    );
  }


  if (step === 'success' || step === 'otp_sent') {
    return (
      <div className="min-h-screen bg-[#050B18] flex items-center justify-center p-6" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 border border-white/10 rounded-[40px] p-12 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="text-6xl mb-6"
          >
            {step === 'otp_sent' ? '📧' : '🎉'}
          </motion.div>
          <h1 className="text-3xl font-black text-white mb-3">
            {registrationResult?.merged 
              ? 'تم تأكيد دعوتك المسبقة!' 
              : (step === 'otp_sent' ? 'تحقق من بريدك!' : 'تم التسجيل بنجاح!')}
          </h1>
          <p className="text-brand-secondary/60 mb-8 text-sm leading-relaxed">
            {registrationResult?.merged
              ? (step === 'otp_sent' 
                  ? `لقد وجدنا بياناتك المسبقة. تم تحديثها وإرسال رمز التحقق إلى ${formData.email}`
                  : 'لقد وجدنا تسجيلك المسبق وتم تحديث بياناتك بنجاح.')
              : (step === 'otp_sent'
                  ? `أرسلنا رمز تحقق إلى ${formData.email} — استخدمه لتسجيل الدخول لبوابة المشاركين`
                  : 'تم تسجيلك بنجاح في الفعالية. احتفظ برقمك للدخول.')}
          </p>

          {registrationResult && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-8 text-right">
              <p className="text-amber-500/60 text-xs font-bold uppercase tracking-widest mb-2">رقم مشاركتك</p>
              <p className="text-4xl font-black text-amber-400 tracking-widest font-mono">{registrationResult.order_num}</p>
              <p className="text-white/40 text-sm mt-2">احتفظ بهذا الرقم للدخول</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {step === 'otp_sent' && (
              <Button
                variant="gold"
                className="w-full h-14 text-lg font-black"
                onClick={() => navigate(`/participant-login?order_num=${registrationResult.order_num}&email=${formData.email}`)}
              >
                تحقق من هويتك وادخل البوابة ←
              </Button>
            )}
            <button
              onClick={() => navigate('/')}
              className="text-white/30 text-sm hover:text-white/60 transition-colors"
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── التسجيل مغلق: عرض المعلومات العامة فقط ─────────────────────────
  if (!event.registration_enabled) {
    return (
      <div className="min-h-screen bg-[#050B18] text-white flex items-center justify-center px-6" dir="rtl">
        <div className="fixed inset-0 pointer-events-none opacity-20">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-primary blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-slate-700 blur-[100px] rounded-full" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-lg w-full text-center space-y-8"
        >
          {event.logo_url && (
            <img src={getFullUrl(event.logo_url)} alt="logo" className="w-20 h-20 mx-auto rounded-2xl object-contain" />
          )}
          <h1 className="text-3xl font-black leading-tight">{event.event_name}</h1>

          <div className="grid grid-cols-2 gap-4 text-right">
            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
              <Calendar className="text-amber-500 mb-3" size={20} />
              <div className="text-xs text-white/40 mb-1 font-bold">التاريخ</div>
              <div className="text-sm font-bold">{safeFormatDate(event.event_date)}</div>
            </div>
            {event.map_url ? (
              <a href={event.map_url} target="_blank" rel="noopener noreferrer" className="bg-white/5 border border-white/10 p-5 rounded-3xl block hover:bg-white/10 hover:border-amber-500/30 transition-all cursor-pointer">
                <MapPin className="text-amber-500 mb-3 animate-bounce" size={20} />
                <div className="text-xs text-white/40 mb-1 font-bold">الموقع (اضغط للخريطة) 📍</div>
                <div className="text-sm font-bold underline decoration-amber-500/40">{event.location || 'سيتم التحديد لاحقاً'}</div>
              </a>
            ) : (
              <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
                <MapPin className="text-amber-500 mb-3" size={20} />
                <div className="text-xs text-white/40 mb-1 font-bold">الموقع</div>
                <div className="text-sm font-bold">{event.location || 'سيتم التحديد لاحقاً'}</div>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-800/60 border border-slate-600/40 rounded-[28px] space-y-3">
            <div className="text-4xl">⏸️</div>
            <h2 className="text-xl font-black text-white">التسجيل مغلق حالياً</h2>
            <p className="text-white/50 text-sm leading-relaxed">
              هذه الفعالية غير مفتوحة للتسجيل العام حالياً.
              إذا كنت مدعواً مسبقاً تواصل مع المنظم للحصول على رابط دخولك.
            </p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="text-white/30 text-sm hover:text-white/60 transition-colors"
          >
            ← العودة للصفحة الرئيسية
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── نموذج التسجيل (التسجيل مفتوح) ──────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050B18] text-white selection:bg-amber-500 selection:text-brand-dark overflow-x-hidden" dir="rtl">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-primary blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto px-6 py-12 lg:py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* ─── Info Panel */}
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 lg:sticky lg:top-12">
            <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full text-sm font-bold border ${
              event.registration_enabled
                ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-secondary'
                : 'bg-slate-700/40 border-slate-600/30 text-slate-400'
            }`}>
              <Sparkles size={16} />
              {event.registration_enabled ? 'التسجيل مفتوح الآن' : 'التسجيل مغلق'}
            </div>
            {event.logo_url && (
              <img 
                src={getFullUrl(event.logo_url)} 
                alt="logo" 
                className="w-24 h-24 rounded-3xl object-contain shadow-2xl bg-white/5 border border-white/10 p-2 block" 
              />
            )}
            <h1 className={`font-black leading-tight ${event.event_name?.length > 40 ? 'text-2xl lg:text-4xl' : 'text-4xl lg:text-6xl'}`}>
              انضم إلينا في
              <span className="block mt-3 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                {event.event_name}
              </span>
            </h1>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
                <Calendar className="text-amber-500 mb-3" size={20} />
                <div className="text-xs text-white/40 mb-1 font-bold">التاريخ</div>
                <div className="text-sm font-bold">{safeFormatDate(event.event_date)}</div>
              </div>
              {event.map_url ? (
                <a href={event.map_url} target="_blank" rel="noopener noreferrer" className="bg-white/5 border border-white/10 p-5 rounded-3xl block hover:bg-white/10 hover:border-amber-500/30 transition-all cursor-pointer">
                  <MapPin className="text-amber-500 mb-3 animate-bounce" size={20} />
                  <div className="text-xs text-white/40 mb-1 font-bold">الموقع (اضغط للخريطة) 📍</div>
                  <div className="text-sm font-bold underline decoration-amber-500/40">{event.location || 'سيتم التحديد لاحقاً'}</div>
                </a>
              ) : (
                <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
                  <MapPin className="text-amber-500 mb-3" size={20} />
                  <div className="text-xs text-white/40 mb-1 font-bold">الموقع</div>
                  <div className="text-sm font-bold">{event.location || 'سيتم التحديد لاحقاً'}</div>
                </div>
              )}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[28px] flex items-center justify-between">
              <div>
                <div className="text-amber-500 text-xs font-black uppercase tracking-widest mb-1">مبلغ الاشتراك</div>
                <div className="text-3xl font-black text-white">
                  {event.require_payment ? `${Number(event.ticket_price || 0).toLocaleString()} ${event.currency || 'DZD'}` : 'مجاناً 🎁'}
                </div>
              </div>
              <Ticket size={40} className="text-amber-500/20" />
            </div>
          </motion.div>

          {/* ─── Form */}
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="bg-white/5 backdrop-blur-3xl border border-white/10 p-8 md:p-10 rounded-[40px] shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-black mb-2">بيانات التسجيل</h2>
              <p className="text-brand-secondary/40 text-sm font-bold">يرجى إكمال النموذج أدناه</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* نوع المشارك */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/30">نوع المشاركة</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowRolePicker(!showRolePicker)}
                    className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-5 py-4 hover:border-amber-500/40 transition-all"
                  >
                    <span className="font-bold text-white">{selectedRole.icon} {selectedRole.label}</span>
                    <ChevronDown size={16} className={`text-white/30 transition-transform ${showRolePicker ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showRolePicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="absolute top-full mt-2 w-full bg-[#0D1527] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl"
                      >
                        {PARTICIPANT_ROLES.map(role => (
                          <button
                            key={role.value} type="button"
                            onClick={() => { setFormData(p => ({ ...p, role: role.value })); setShowRolePicker(false); }}
                            className={`w-full flex items-center gap-4 px-5 py-4 text-right hover:bg-white/5 transition-all ${formData.role === role.value ? 'bg-amber-500/10' : ''}`}
                          >
                            <span className="text-xl">{role.icon}</span>
                            <div>
                              <div className="font-bold text-white text-sm">{role.label}</div>
                              <div className="text-white/30 text-xs">{role.desc}</div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* الاسم */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/30">الاسم الكامل *</label>
                <div className="relative group">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500" size={18} />
                  <input required type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="الاسم الثلاثي..." className="w-full bg-white/5 border border-white/10 rounded-2xl pr-12 pl-6 py-4 outline-none focus:border-amber-500 transition-all font-bold text-right" />
                </div>
              </div>

              {/* الصفة المهنية */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/30">الصفة المهنية / المؤسسة *</label>
                <div className="relative group">
                  <Building className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500" size={18} />
                  <input required type="text" value={formData.organization} onChange={e => setFormData({ ...formData, organization: e.target.value })} placeholder="الصفة المهنية أو المؤسسة..." className="w-full bg-white/5 border border-white/10 rounded-2xl pr-12 pl-6 py-4 outline-none focus:border-amber-500 transition-all font-bold text-right" />
                </div>
              </div>

              {/* البريد والهاتف (بيانات إلزامية) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-white/30">البريد الإلكتروني *</label>
                  <div className="relative group">
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500" size={16} />
                    <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" className="w-full bg-white/5 border border-white/10 rounded-2xl pr-11 pl-4 py-4 outline-none focus:border-amber-500 transition-all font-bold text-right text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-white/30">رقم الهاتف (بالصيغة الدولية) *</label>
                  <div className="relative group">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500" size={16} />
                    <input required type="tel" value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} placeholder="+966500000000" className="w-full bg-white/5 border border-white/10 rounded-2xl pr-11 pl-4 py-4 outline-none focus:border-amber-500 transition-all font-bold text-right text-sm" />
                  </div>
                </div>
              </div>

              {/* الاختصاص والعنوان المهني (بيانات إضافية اختيارية) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-white/30">الاختصاص (اختياري)</label>
                  <div className="relative group">
                    <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500" size={16} />
                    <input type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="التخصص أو مجال العمل..." className="w-full bg-white/5 border border-white/10 rounded-2xl pr-11 pl-4 py-4 outline-none focus:border-amber-500 transition-all font-bold text-right text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-white/30">العنوان المهني (اختياري)</label>
                  <div className="relative group">
                    <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500" size={16} />
                    <input type="text" value={formData.professional_address} onChange={e => setFormData({ ...formData, professional_address: e.target.value })} placeholder="مقر العمل أو العنوان المهني..." className="w-full bg-white/5 border border-white/10 rounded-2xl pr-11 pl-4 py-4 outline-none focus:border-amber-500 transition-all font-bold text-right text-sm" />
                  </div>
                </div>
              </div>

              {/* الحقول المخصصة */}
              {customFields.map(field => (
                <div key={field.id} className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-white/30">{field.display_label} {field.is_required ? '*' : ''}</label>
                  <input required={field.is_required} type={field.field_type} value={customValues[field.field_name] || ''} onChange={e => setCustomValues({ ...customValues, [field.field_name]: e.target.value })} placeholder={`أدخل ${field.display_label}...`} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-amber-500 transition-all font-bold text-right" />
                </div>
              ))}



              {showOtpVerification && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 bg-amber-500/5 border border-amber-500/20 p-6 rounded-3xl"
                >
                  <label className="text-sm font-bold text-amber-400 block">أدخل رمز التحقق (OTP) المرسل لبريدك الإلكتروني *</label>
                  <div className="relative group">
                    <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500/60" size={18} />
                    <input 
                      required 
                      type="text" 
                      maxLength={6} 
                      value={verificationCode} 
                      onChange={e => setVerificationCode(e.target.value)} 
                      placeholder="أدخل الرمز المكون من 6 أرقام..." 
                      className="w-full bg-white/5 border border-amber-500/30 rounded-2xl pr-12 pl-6 py-4 outline-none focus:border-amber-500 transition-all font-bold tracking-widest text-center text-xl text-white" 
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold mt-2">
                    <span className="text-white/40">يرجى فحص صندوق الوارد (أو البريد المزعج)</span>
                    <button 
                      type="button" 
                      onClick={async () => {
                        setError(null);
                        setSendingOtp(true);
                        try {
                          await api.post('participants/public/send-verification-otp', {
                            email: formData.email,
                            event_id: parseInt(eventId)
                          });
                        } catch (err) {
                          setError(err.response?.data?.detail || 'فشل إعادة إرسال الرمز.');
                        } finally {
                          setSendingOtp(false);
                        }
                      }}
                      className="text-amber-500 hover:underline"
                    >
                      إعادة إرسال الرمز
                    </button>
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold text-center">{error}</div>
              )}

              {/* اختيار طريقة الدفع */}
              {event.require_payment && event.ticket_price > 0 && event.allow_transfer_payment && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-brand-secondary/50">طريقة التسديد</p>
                  <div className="grid grid-cols-2 gap-3">
                    {event.payment_gateway && event.payment_gateway !== 'none' && (
                      <button type="button"
                        onClick={() => setPaymentMethod('online')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-bold transition-all text-sm ${paymentMethod === 'online' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-white/10 bg-white/3 text-white/40 hover:bg-white/8'}`}>
                        <span className="text-2xl">💳</span>
                        <span>دفع إلكتروني</span>
                      </button>
                    )}
                    <button type="button"
                      onClick={() => setPaymentMethod('transfer')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-bold transition-all text-sm ${paymentMethod === 'transfer' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-white/10 bg-white/3 text-white/40 hover:bg-white/8'}`}>
                      <span className="text-2xl">🏦</span>
                      <span>حوالة بنكية</span>
                    </button>
                  </div>
                  {paymentMethod === 'transfer' && (
                    <p className="text-xs text-amber-500/60 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                      ستُسجَّل بحالة مؤقتة. بعد التسجيل، حوّل المبلغ وارفع صورة الوصل من بوابتك لتفعيل حسابك.
                    </p>
                  )}
                </div>
              )}

              <Button type="submit" disabled={submitting || sendingOtp || !event.registration_enabled} className="w-full h-16 bg-amber-500 hover:bg-amber-600 text-brand-dark rounded-[24px] text-lg font-black flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/20 mt-2">
                {submitting || sendingOtp
                  ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-4 border-brand-dark/20 border-t-brand-dark rounded-full" />
                  : <>{showOtpVerification ? 'تأكيد الرمز وإتمام التسجيل 🎟' : (event.require_payment && paymentMethod === 'transfer' ? '🏦 تسجيل والانتقال للحوالة' : event.require_payment ? '💳 تأكيد التسجيل والانتقال للدفع' : '🎟 إتمام التسجيل مجاناً')}</>
                }
              </Button>

              <div className="flex items-center justify-center gap-2 text-white/20 text-[10px] font-black uppercase tracking-widest pt-1">
                <ShieldCheck size={12} /> تشفير آمن للبيانات والمعلومات الشخصية
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AttendeeRegistrationPage;
