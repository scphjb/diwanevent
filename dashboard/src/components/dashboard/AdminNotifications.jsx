import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast, { Toaster } from 'react-hot-toast';
import useAttendanceSocket from '../../hooks/useAttendanceSocket';
import { Bell, ShieldAlert, Award, Info } from 'lucide-react';
import { useBadge } from '../../hooks/useBadge';

const AdminNotifications = ({ eventId }) => {
  const { t } = useTranslation();
  const { setBadge } = useBadge();
  const unreadCount = useRef(0);

  // مسح الـ Badge عند فتح التطبيق
  useEffect(() => {
    setBadge(0);
    const handleFocus = () => { unreadCount.current = 0; setBadge(0); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [setBadge]);

  useAttendanceSocket(eventId, (message) => {
    if (message.type === 'admin_notification') {
      const { title, message: text, level } = message.data;

      // تحديث Badge API — يزيد العداد على الأيقونة
      if (document.hidden) {
        unreadCount.current += 1;
        setBadge(unreadCount.current);
      }

      // تشغيل صوت تنبيه خفيف (اختياري)
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.play().catch(() => {});

      // عرض التنبيه بناءً على المستوى
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-[#050B18]/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[24px] pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                {renderIcon(level)}
              </div>
              <div className="mr-3 flex-1">
                <p className="text-sm font-bold text-white">
                  {title}
                </p>
                <p className="mt-1 text-xs text-brand-secondary/60">
                  {text}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-r border-white/5">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-l-2xl p-4 flex items-center justify-center text-sm font-medium text-brand-secondary hover:text-white transition-colors"
            >
              {t('common.notifications.close', 'إغلاق')}
            </button>
          </div>
        </div>
      ), { duration: 5000 });
    }
  });

  const renderIcon = (level) => {
    switch (level) {
      case 'success': return <Award className="h-10 w-10 text-amber-500 bg-amber-500/10 p-2 rounded-xl" />;
      case 'warning': return <ShieldAlert className="h-10 w-10 text-orange-500 bg-orange-500/10 p-2 rounded-xl" />;
      case 'error': return <ShieldAlert className="h-10 w-10 text-red-500 bg-red-500/10 p-2 rounded-xl" />;
      default: return <Info className="h-10 w-10 text-blue-500 bg-blue-500/10 p-2 rounded-xl" />;
    }
  };

  return <Toaster position="top-center" reverseOrder={false} />;
};

export default AdminNotifications;
