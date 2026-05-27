import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Zap, WifiOff, ExternalLink } from 'lucide-react';

// أيقونة المشاركة الخاصة بنظام iOS
const IOSShareIcon = () => (
  <svg 
    width="18" 
    height="18" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px', color: '#D4AF37' }}
  >
    <rect x="5" y="9" width="14" height="11" rx="2" ry="2" />
    <polyline points="9 5 12 2 15 5" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

/**
 * مكون Install Prompt المطور لـ PWA ديوان إيفنت
 * يدعم التثبيت المباشر على أندرويد/كروم، التثبيت اليدوي الإرشادي على آيفون، والتنبيه في متصفحات تطبيقات البريد الداخلي.
 */
const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [promptType, setPromptType] = useState(null); // 'native' | 'ios' | 'inapp'
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // 1. تحقق إذا كان التطبيق مثبتاً مسبقاً ويعمل بوضع مستقل
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // 2. تحقق إذا رفض المستخدم التثبيت مسبقاً لتفادي الإزعاج
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) return;

    // 3. كشف بيئة التشغيل والمتصفحات الداخلية
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // كشف المتصفحات الداخلية (Gmail, Outlook, Messenger, WhatsApp, Line, WebView)
    const isAndroidWebView = /wv/i.test(userAgent) || 
                             (/Android/i.test(userAgent) && /Version\/[0-9.]+/i.test(userAgent));
    const isIOSWebView = isIOS && !window.navigator.standalone && !/Safari/i.test(userAgent);
    const isInAppBrowser = /FBAN|FBAV|Instagram|Messenger|Twitter|GSA|Gmail|WhatsApp|Line/i.test(userAgent) || 
                           isAndroidWebView || isIOSWebView;

    if (isInAppBrowser) {
      setPromptType('inapp');
      setTimeout(() => setShowBanner(true), 3000);
    } else if (isIOS) {
      setPromptType('ios');
      setTimeout(() => setShowBanner(true), 3000);
    }

    // 4. معالج التثبيت التلقائي لأندرويد/كروم
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPromptType('native');
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

  if (installed || !showBanner) return null;

  return (
    <>
      {/* ─── البانر السفلي الموحد ─── */}
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
                border: '1px solid rgba(212, 175, 55, 0.2)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 -4px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(212, 175, 55, 0.05)',
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

              {/* نصوص البانر حسب بيئة التشغيل */}
              <div className="flex-1 min-w-0 text-right">
                {promptType === 'inapp' && (
                  <>
                    <p className="text-amber-500 font-bold text-[13px] leading-tight">
                      ⚠️ افتح الرابط في المتصفح الافتراضي
                    </p>
                    <p className="text-white/60 text-[11px] mt-1 leading-normal font-medium">
                      لتتمكن من تثبيت بوابة ديوان وتلقي التنبيهات وتصفحها كـ PWA.
                    </p>
                  </>
                )}

                {promptType === 'ios' && (
                  <>
                    <p className="text-white font-bold text-[13px] leading-tight">
                      📲 تثبيت بوابة ديوان على آيفون
                    </p>
                    <p className="text-white/60 text-[11px] mt-1 leading-normal font-medium">
                      اضغط على زر المشاركة <IOSShareIcon /> ثم اختر <strong>إضافة إلى الشاشة الرئيسية</strong>.
                    </p>
                  </>
                )}

                {promptType === 'native' && (
                  <>
                    <p className="text-white font-bold text-[13px] leading-tight">
                      ⚡ ثبّت تطبيق ديوان إيفنت
                    </p>
                    <p className="text-white/60 text-[11px] mt-0.5 leading-tight font-medium">
                      وصول أسرع بضغطة واحدة • يعمل بالكامل بدون إنترنت.
                    </p>
                  </>
                )}
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex items-center gap-2">
                {promptType === 'native' && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2.5 rounded-xl text-xs font-black text-white"
                    style={{ background: 'linear-gradient(135deg, #2A64EC, #38BDF8)' }}
                  >
                    تثبيت
                  </motion.button>
                )}
                
                {promptType === 'inapp' && (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 animate-pulse">
                    <ExternalLink size={14} className="text-amber-500" />
                  </div>
                )}

                <button
                  onClick={handleDismiss}
                  className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <X size={14} className="text-white/60" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modal التفاصيل لنظام أندرويد/كروم ─── */}
      <AnimatePresence>
        {showModal && promptType === 'native' && (
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
              {/* أيقونة ذهبية كبيرة */}
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
              <p className="text-white/50 text-sm mb-8">البوابة الرقمية التفاعلية للمشارك</p>

              {/* المميزات */}
              <div className="space-y-3 mb-8 text-right">
                {[
                  { icon: Zap, label: 'أداء فوري وأوقات تحميل أسرع', color: '#D4AF37' },
                  { icon: WifiOff, label: 'الوصول لبطاقتك والجدول بدون إنترنت', color: '#38BDF8' },
                  { icon: Smartphone, label: 'تنبيهات فورية وشاشة كاملة ممتازة', color: '#2A64EC' },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-3 px-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}20` }}
                    >
                      <Icon size={16} style={{ color }} />
                    </div>
                    <span className="text-white/80 text-sm font-bold">{label}</span>
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
                className="mt-4 text-white/30 text-sm hover:text-white/60 transition-colors font-bold"
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
