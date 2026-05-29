import { useState, useEffect, useRef } from 'react';

/**
 * هوك موحّد لكشف حالة الاتصال الفعلي بالخادم.
 *
 * المشكلة القديمة: navigator.onLine يُرجع true حتى عند الاتصال بـ WiFi بدون إنترنت،
 * مما يتسبب في بنرات "لا يوجد اتصال" وهمية عند أي تأخر شبكي مؤقت.
 *
 * الحل الجديد: ping حقيقي لـ /api/v1/health كل 15 ثانية، مع fallback سريع
 * على navigator.onLine لتحديثات اللحظة الأولى فقط.
 */
export const useOfflineStatus = () => {
  // نبدأ optimistically: إذا navigator.onLine=true نفترض الاتصال حتى يثبت العكس
  const [isOffline, setIsOffline] = useState(false);
  const intervalRef = useRef(null);
  const pendingCheckRef = useRef(false);

  const checkServerReachability = async () => {
    // منع تشغيل فحصين في نفس الوقت
    if (pendingCheckRef.current) return;
    pendingCheckRef.current = true;

    // التحسين: تجاهل الفحص إذا كان المتصفح يعرف أن الشبكة مقطوعة
    if (!navigator.onLine) {
      setIsOffline(true);
      pendingCheckRef.current = false;
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 ثوانٍ كحد أقصى

    try {
      const res = await fetch('/api/v1/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      // أي رد من الخادم (حتى 401) يعني أن الاتصال موجود
      setIsOffline(!res.ok && res.status !== 401 && res.status !== 403);
    } catch (_) {
      clearTimeout(timeoutId);
      // فشل الطلب = إما انقطاع شبكة حقيقي أو الخادم متوقف
      setIsOffline(true);
    } finally {
      pendingCheckRef.current = false;
    }
  };

  useEffect(() => {
    // فحص فوري عند تحميل التطبيق
    checkServerReachability();

    // فحص دوري كل 15 ثانية بدلاً من الاعتماد على أحداث المتصفح فقط
    intervalRef.current = setInterval(checkServerReachability, 15000);

    // مستمعو أحداث المتصفح للتحديث الفوري عند تغيير الشبكة
    const handleOnline  = () => checkServerReachability();
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOffline };
};
