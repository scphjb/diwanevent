import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, BellRing, Check, X } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

/**
 * مكون إدارة إشعارات Push في إعدادات المستخدم
 */
const PushNotificationManager = () => {
  const { supported, permission, isSubscribed, loading, subscribe, unsubscribe } =
    usePushNotifications();
  const [showToast, setShowToast] = useState(null); // { type: 'success'|'error', msg }

  const showFeedback = (type, msg) => {
    setShowToast({ type, msg });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      showFeedback('success', 'تم إلغاء الإشعارات');
    } else {
      const result = await subscribe();
      if (result.success) {
        showFeedback('success', 'تم تفعيل الإشعارات');
      } else if (result.reason === 'denied') {
        showFeedback('error', 'تم رفض الإذن — يرجى تفعيله من إعدادات المتصفح');
      } else {
        showFeedback('error', 'حدث خطأ أثناء الاشتراك');
      }
    }
  };

  if (!supported) {
    return (
      <div
        className="flex items-center gap-3 p-4 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <BellOff size={20} className="text-white/30" />
        <div>
          <p className="text-white/50 text-sm font-medium">الإشعارات غير مدعومة</p>
          <p className="text-white/25 text-xs">متصفحك لا يدعم Web Push</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* البطاقة الرئيسية */}
      <motion.div
        className="flex items-center justify-between p-4 rounded-2xl cursor-pointer"
        style={{
          background: isSubscribed
            ? 'rgba(42, 100, 236, 0.1)'
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isSubscribed ? 'rgba(42, 100, 236, 0.3)' : 'rgba(255,255,255,0.08)'}`,
          transition: 'all 0.3s ease',
        }}
        onClick={handleToggle}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: isSubscribed ? 'rgba(42, 100, 236, 0.2)' : 'rgba(255,255,255,0.08)',
            }}
          >
            {isSubscribed ? (
              <BellRing size={20} style={{ color: '#38BDF8' }} />
            ) : (
              <Bell size={20} className="text-white/40" />
            )}
          </div>
          <div>
            <p className="text-white font-bold text-sm">
              {isSubscribed ? 'الإشعارات مفعّلة' : 'تفعيل الإشعارات'}
            </p>
            <p className="text-white/40 text-xs mt-0.5">
              {isSubscribed
                ? 'ستصلك تنبيهات الفعاليات فوراً'
                : 'احصل على تنبيهات لحظية حتى عند إغلاق التطبيق'}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex-shrink-0">
          {loading ? (
            <div
              className="w-10 h-6 rounded-full"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <div className="w-4 h-4 mx-auto mt-1 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <motion.div
              className="w-12 h-6 rounded-full relative"
              style={{
                background: isSubscribed
                  ? 'linear-gradient(135deg, #2A64EC, #38BDF8)'
                  : 'rgba(255,255,255,0.15)',
              }}
              animate={{ backgroundColor: isSubscribed ? '#2A64EC' : 'rgba(255,255,255,0.15)' }}
            >
              <motion.div
                className="absolute top-1 w-4 h-4 rounded-full bg-white"
                animate={{ right: isSubscribed ? '4px' : '24px' }}
                transition={{ type: 'spring', damping: 20 }}
                style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
              />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* أنواع الإشعارات (عند التفعيل) */}
      <AnimatePresence>
        {isSubscribed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2"
          >
            <div
              className="p-3 rounded-xl space-y-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-white/40 text-xs font-medium mb-2">ستصلك إشعارات عند:</p>
              {[
                'تسجيل مشارك جديد',
                'سؤال ينتظر الإشراف',
                'تحديث على الفعالية',
                'بدء جلسة مباشرة',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Check size={12} style={{ color: '#38BDF8' }} />
                  <span className="text-white/60 text-xs">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className="absolute -top-14 left-0 right-0 mx-auto w-fit px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
            style={{
              background: showToast.type === 'success' ? 'rgba(56,189,248,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${showToast.type === 'success' ? 'rgba(56,189,248,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: showToast.type === 'success' ? '#38BDF8' : '#F87171',
            }}
          >
            {showToast.type === 'success' ? <Check size={14} /> : <X size={14} />}
            {showToast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PushNotificationManager;
