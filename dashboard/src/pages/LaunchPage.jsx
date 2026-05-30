import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * صفحة الإطلاق الذكية للـ PWA — تعمل على مسار /launch
 * هي نقطة البداية start_url في manifest.json
 *
 * لماذا هذا المسار وليس /dashboard؟
 * لأن /dashboard محمي بـ ProtectedRoute ويُحيل فوراً لـ /login
 * قبل أن يتمكن أي كود من التحقق من نوع المستخدم وتوجيهه بشكل صحيح.
 *
 * منطق التوجيه:
 *  1. منظم/مدير (diwan_token + role)    → /dashboard
 *  2. سوبر أدمن                          → /super-admin
 *  3. مشارك (last_active_participant_portal) → /p/:eid/:token
 *  4. لا شيء → صفحة الهبوط /
 */
const LaunchPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirect = () => {
      // 1. منظم أو مدير؟
      const token = localStorage.getItem('diwan_token');
      const user  = JSON.parse(localStorage.getItem('diwan_user') || '{}');

      if (token && user?.role) {
        const dest = user.role === 'super_admin' ? '/super-admin' : '/dashboard';
        navigate(dest, { replace: true });
        return;
      }

      // 2. مشارك لديه بوابة نشطة محفوظة؟
      const lastPortal = localStorage.getItem('last_active_participant_portal');
      if (lastPortal) {
        navigate(lastPortal, { replace: true });
        return;
      }

      // 3. هل نحن في تطبيق PWA مستقل (Standalone Mode)؟
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      if (isStandalone) {
        // في التطبيق المستقل PWA، المشارك هو المستهدف الرئيسي. نوجهه لصفحة الدخول المخصصة للمشاركين.
        navigate('/participant-login', { replace: true });
        return;
      }

      // 4. لا شيء → صفحة الهبوط
      navigate('/', { replace: true });
    };

    // تأخير بسيط لضمان تهيئة localStorage قبل القراءة
    const timer = setTimeout(redirect, 50);
    return () => clearTimeout(timer);
  }, [navigate]);

  // شاشة تحميل مؤقتة تظهر للحظة قبل التوجيه
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050B18',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Cairo, system-ui, sans-serif',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          width: 80,
          height: 80,
          background: 'linear-gradient(135deg, #D4AF37, #F0C040)',
          borderRadius: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          fontWeight: 900,
          color: '#050B18',
          boxShadow: '0 20px 60px rgba(212,175,55,0.35)',
          marginBottom: 24,
        }}
      >
        D
      </motion.div>

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{
          width: 32,
          height: 32,
          border: '3px solid rgba(212,175,55,0.2)',
          borderTopColor: '#D4AF37',
          borderRadius: '50%',
        }}
      />
    </div>
  );
};

export default LaunchPage;
