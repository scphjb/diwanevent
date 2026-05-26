import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Zap, WifiOff } from 'lucide-react';

/**
 * مكون Install Prompt المخصص لـ PWA ديوان
 * يعترض حدث beforeinstallprompt ويعرض واجهة احترافية بدلاً من الافتراضية
 */
const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // تحقق إذا كان مثبتاً مسبقاً
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    // تحقق إذا رفض المستخدم سابقاً
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // انتظر 3 ثوانٍ قبل عرض البانر لعدم الإزعاج
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowBanner(false);
      setShowModal(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    setShowModal(false);

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setInstalled(true);
      setShowBanner(false);
    } else {
      localStorage.setItem('pwa_install_dismissed', 'true');
      setShowBanner(false);
    }
    setDeferredPrompt(null);
    setInstalling(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (installed || !deferredPrompt) return null;

  return (
    <>
      {/* ─── البانر السفلي ─── */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pb-6"
            style={{ direction: 'rtl' }}
          >
            <div
              className="max-w-md mx-auto rounded-[28px] p-4 flex items-center gap-4"
              style={{
                background: 'rgba(13, 21, 39, 0.95)',
                border: '1px solid rgba(42, 100, 236, 0.3)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 -4px 40px rgba(42, 100, 236, 0.15)',
              }}
            >
              {/* أيقونة التطبيق */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-2xl"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37, #F0C040)',
                  color: '#050B18',
                  boxShadow: '0 8px 24px rgba(212, 175, 55, 0.3)',
                }}
              >
                D
              </div>

              {/* النص */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">
                  ثبّت ديوان إيفنت
                </p>
                <p className="text-white/50 text-xs mt-0.5 leading-tight">
                  وصول أسرع • يعمل بدون إنترنت
                </p>
              </div>

              {/* أزرار */}
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #2A64EC, #38BDF8)' }}
                >
                  تثبيت
                </motion.button>
                <button
                  onClick={handleDismiss}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <X size={14} className="text-white/60" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modal التفاصيل ─── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(5, 11, 24, 0.8)', backdropFilter: 'blur(12px)', direction: 'rtl' }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[32px] p-8 text-center"
              style={{
                background: '#0D1527',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
              }}
            >
              {/* أيقونة كبيرة */}
              <div
                className="w-20 h-20 rounded-[24px] flex items-center justify-center mx-auto mb-6 text-4xl font-black"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37, #F0C040)',
                  color: '#050B18',
                  boxShadow: '0 20px 60px rgba(212, 175, 55, 0.4)',
                }}
              >
                D
              </div>

              <h2 className="text-white font-black text-xl mb-2">ديوان إيفنت</h2>
              <p className="text-white/50 text-sm mb-8">منصة تسيير الفعاليات الاحترافية</p>

              {/* المميزات */}
              <div className="space-y-3 mb-8 text-right">
                {[
                  { icon: Zap, label: 'تحميل فوري وأداء أسرع', color: '#D4AF37' },
                  { icon: WifiOff, label: 'يعمل بدون اتصال بالإنترنت', color: '#38BDF8' },
                  { icon: Smartphone, label: 'تجربة تطبيق أصلي كاملة', color: '#2A64EC' },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-3 px-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}20` }}
                    >
                      <Icon size={16} style={{ color }} />
                    </div>
                    <span className="text-white/80 text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>

              {/* زر التثبيت */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleInstall}
                disabled={installing}
                className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #2A64EC, #38BDF8)',
                  color: 'white',
                  boxShadow: '0 12px 40px rgba(42, 100, 236, 0.4)',
                }}
              >
                {installing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Download size={18} />
                    تثبيت التطبيق
                  </>
                )}
              </motion.button>

              <button
                onClick={() => setShowModal(false)}
                className="mt-4 text-white/30 text-sm hover:text-white/60 transition-colors"
              >
                ليس الآن
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPrompt;
