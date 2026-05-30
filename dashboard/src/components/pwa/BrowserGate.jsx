import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────
   BrowserGate — شاشة الحماية من المتصفحات المدمجة (WebView)

   لماذا هذا المكوّن ضروري؟
   ─────────────────────────
   عندما يستلم المشارك رابط البوابة السحرية عبر واتساب أو تيليغرام
   أو جيميل، يُفتح الرابط في متصفح مدمج (WebView) يفقد:
     • إمكانية تثبيت التطبيق (beforeinstallprompt لا يعمل)
     • Service Worker غير موثوق → الكاش والـ PWA لا تعمل
     • الكاميرا في iOS WebView مقيّدة → مسح QR لا يعمل
     • localStorage معزولة → لا يُحفظ last_active_participant_portal

   الحل: شاشة حاجبة كاملة تُرشد المستخدم لفتح الرابط في المتصفح
   الحقيقي (Chrome / Safari) مع:
     1. زر "نسخ الرابط" الفوري
     2. زر "فتح في Chrome" عبر intent:// scheme (أندرويد فقط)
     3. تعليمات مرئية خطوة بخطوة (iOS / أندرويد)
     4. زر "المتابعة على أي حال" للمنظمين أو حالات الطوارئ
──────────────────────────────────────────────────────────────── */

// ─── مساعد: كشف متصفح واتساب أو تيليغرام أو أي WebView ──────
const detectInAppBrowser = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';

  // تشغيل PWA مستقل = ليس WebView
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (isStandalone) return { isInApp: false };

  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isAndroid = /Android/i.test(ua);

  // ─── أسماء تطبيقات معروفة بإطارات WebView خاصة ───
  const knownInAppApps = [
    'FBAN', 'FBAV',               // Facebook
    'Instagram',                   // Instagram
    'Messenger',                   // Messenger
    'WhatsApp',                    // واتساب
    'Twitter',                     // تويتر / X
    'TelegramBot',                 // Telegram WebView
    'Line',                        // Line
    'Snapchat',                    // Snapchat
    'GSA',                         // Google Search App (iOS)
    'YaBrowser',                   // Yandex Browser
    'MicroMessenger',              // WeChat
    'LinkedInApp',                 // LinkedIn
    'Puffin',                      // Puffin Browser
  ];

  const matchesKnownApp = knownInAppApps.some(app =>
    new RegExp(app, 'i').test(ua)
  );

  // ─── كشف WebView أندرويد ───
  // Android WebView: يحتوي "wv" أو "Version/X.X" مع Android (لا Chrome المستقل)
  const isAndroidWebView =
    (isAndroid && /; wv\)/i.test(ua)) ||
    (isAndroid && /Version\/\d+\.\d+/i.test(ua) && !/Chrome\/\d+/i.test(ua));

  // ─── كشف WebView iOS ───
  // iOS Safari الحقيقي: يحتوي "Safari" ولا يحتوي "CriOS" / "FxiOS" (Chrome/Firefox على iOS)
  // iOS WebView: لا "Safari" في UA أو هو standalone
  const isIOSWebView =
    isIOS &&
    !window.navigator.standalone &&
    !/Safari\/\d+/i.test(ua) &&
    !/CriOS\/\d+/i.test(ua) &&
    !/FxiOS\/\d+/i.test(ua);

  // Telegram على iOS يُضيف "Telegram" في UA
  const isTelegram = /Telegram/i.test(ua);

  const hasEmailOrigin = window.location.search.includes('origin=email');

  const isInApp =
    matchesKnownApp || isAndroidWebView || isIOSWebView || isTelegram || (hasEmailOrigin && (isIOS || isAndroid));

  // تحديد نوع التطبيق لتخصيص التعليمات
  let appName = 'التطبيق الحالي';
  if (hasEmailOrigin)           appName = 'تطبيق البريد (Gmail/Outlook)';
  else if (/WhatsApp/i.test(ua))    appName = 'واتساب';
  else if (/Telegram/i.test(ua)) appName = 'تيليغرام';
  else if (/FBAN|FBAV/i.test(ua)) appName = 'فيسبوك';
  else if (/Instagram/i.test(ua)) appName = 'إنستغرام';
  else if (/Messenger/i.test(ua)) appName = 'ماسنجر';
  else if (/Twitter/i.test(ua))   appName = 'تويتر';
  else if (/GSA/i.test(ua))       appName = 'تطبيق جوجل';

  return { isInApp, isIOS, isAndroid, appName };
};

// ─── زر نسخ الرابط مع تغذية راجعة بصرية ───────────────────
const CopyLinkButton = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback للمتصفحات التي لا تدعم clipboard API
      const el = document.createElement('textarea');
      el.value = window.location.href;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleCopy}
      style={{
        width: '100%',
        padding: '14px 20px',
        borderRadius: 16,
        border: 'none',
        background: copied
          ? 'linear-gradient(135deg, #22c55e, #16a34a)'
          : 'linear-gradient(135deg, #D4AF37, #F0C040)',
        color: '#050B18',
        fontFamily: 'Cairo, system-ui, sans-serif',
        fontWeight: 900,
        fontSize: '1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        transition: 'background 0.3s',
        boxShadow: copied
          ? '0 8px 24px rgba(34,197,94,0.3)'
          : '0 8px 24px rgba(212,175,55,0.35)',
        direction: 'rtl',
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{copied ? '✅' : '📋'}</span>
      {copied ? 'تم نسخ الرابط!' : 'نسخ الرابط'}
    </motion.button>
  );
};

// ─── زر فتح Chrome عبر intent:// (أندرويد فقط) ─────────────
const OpenInChromeButton = () => {
  const handleOpenChrome = () => {
    const url = window.location.href;
    // intent:// يفتح Chrome مباشرة على أندرويد
    const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;

    // fallback: إذا لم يكن Chrome مثبتاً، افتح في متصفح النظام الافتراضي
    setTimeout(() => {
      window.open(url, '_blank', 'noopener,noreferrer');
    }, 1200);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleOpenChrome}
      style={{
        width: '100%',
        padding: '14px 20px',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.07)',
        color: '#fff',
        fontFamily: 'Cairo, system-ui, sans-serif',
        fontWeight: 700,
        fontSize: '0.95rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        direction: 'rtl',
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>🌐</span>
      فتح في متصفح Chrome
    </motion.button>
  );
};

// ─── تعليمات خطوة بخطوة (iOS) ──────────────────────────────
const IOSInstructions = ({ appName }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '14px 16px',
      direction: 'rtl',
      textAlign: 'right',
    }}
  >
    <p
      style={{
        color: 'rgba(212,175,55,0.9)',
        fontWeight: 700,
        fontSize: '0.8rem',
        marginBottom: 10,
        fontFamily: 'Cairo, system-ui, sans-serif',
      }}
    >
      📱 تعليمات الفتح في Safari:
    </p>
    {[
      `1. انسخ الرابط بالزر أعلاه`,
      `2. اضغط على قائمة ${appName} (⋯ أو ··· أو الزاوية)`,
      `3. اختر "فتح في المتصفح" أو "Open in Browser"`,
      `4. أو افتح Safari والصق الرابط`,
    ].map((step, i) => (
      <p
        key={i}
        style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: '0.78rem',
          lineHeight: 1.8,
          fontFamily: 'Cairo, system-ui, sans-serif',
          margin: '2px 0',
        }}
      >
        {step}
      </p>
    ))}
  </div>
);

// ─── تعليمات خطوة بخطوة (أندرويد) ─────────────────────────
const AndroidInstructions = ({ appName }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '14px 16px',
      direction: 'rtl',
      textAlign: 'right',
    }}
  >
    <p
      style={{
        color: 'rgba(212,175,55,0.9)',
        fontWeight: 700,
        fontSize: '0.8rem',
        marginBottom: 10,
        fontFamily: 'Cairo, system-ui, sans-serif',
      }}
    >
      📱 تعليمات الفتح في Chrome:
    </p>
    {[
      `1. اضغط زر "فتح في Chrome" أعلاه (الأسرع)`,
      `2. أو انسخ الرابط ثم افتح Chrome والصقه`,
      `3. بدلاً من ذلك: اضغط ⋮ في ${appName} → "فتح في المتصفح"`,
    ].map((step, i) => (
      <p
        key={i}
        style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: '0.78rem',
          lineHeight: 1.8,
          fontFamily: 'Cairo, system-ui, sans-serif',
          margin: '2px 0',
        }}
      >
        {step}
      </p>
    ))}
  </div>
);

// ─── المكوّن الرئيسي ────────────────────────────────────────
const BrowserGate = () => {
  const [visible, setVisible]       = useState(false);
  const [dismissed, setDismissed]   = useState(false);
  const [detection, setDetection]   = useState(null);

  useEffect(() => {
    // تجاهل الكشف إذا كان المستخدم قد تجاوز الشاشة في جلسة سابقة
    const wasDismissed = sessionStorage.getItem('browser_gate_dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    const result = detectInAppBrowser();
    setDetection(result);

    if (result.isInApp) {
      // إذا كان أندرويد وتم الفتح من بريد إلكتروني، نقوم بتحويل تلقائي إلى Chrome لراحة المستخدم
      if (result.isAndroid && window.location.search.includes('origin=email')) {
        const url = window.location.href;
        // استبدال origin=email بـ origin=chrome لمنع التكرار اللانهائي
        const cleanUrl = url.replace('origin=email', 'origin=chrome');
        const intentUrl = `intent://${cleanUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
        window.location.href = intentUrl;
        return;
      }

      // تأخير بسيط لضمان تحميل الصفحة قبل الحجب
      setTimeout(() => setVisible(true), 400);
    }
  }, []);

  const handleDismiss = () => {
    // نسمح بتجاوز الشاشة مع تحذير (للمنظمين أو حالات الطوارئ)
    sessionStorage.setItem('browser_gate_dismissed', 'true');
    setVisible(false);
    setDismissed(true);
  };

  if (!visible || dismissed || !detection?.isInApp) return null;

  const { isIOS, isAndroid, appName } = detection;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(5, 11, 24, 0.97)',
            backdropFilter: 'blur(24px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 20px',
            direction: 'rtl',
            overflowY: 'auto',
          }}
        >
          {/* خلفية ديكورية */}
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              right: '-10%',
              width: '50%',
              height: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-10%',
              left: '-10%',
              width: '50%',
              height: '50%',
              background: 'radial-gradient(circle, rgba(42,100,236,0.05) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', damping: 22 }}
            style={{
              width: '100%',
              maxWidth: 400,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 28,
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {/* أيقونة التحذير */}
            <div
              style={{
                width: 72,
                height: 72,
                background: 'rgba(212,175,55,0.12)',
                border: '1px solid rgba(212,175,55,0.25)',
                borderRadius: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                margin: '0 auto',
              }}
            >
              🌐
            </div>

            {/* العنوان */}
            <div>
              <h1
                style={{
                  color: '#fff',
                  fontFamily: 'Cairo, system-ui, sans-serif',
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  margin: '0 0 8px',
                }}
              >
                افتح في متصفحك الأصلي
              </h1>
              <p
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: 'Cairo, system-ui, sans-serif',
                  fontSize: '0.85rem',
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                للحصول على تجربة كاملة وتمكين تثبيت التطبيق وجميع الميزات،
                يرجى فتح هذا الرابط في{' '}
                <strong style={{ color: 'rgba(212,175,55,0.9)' }}>
                  {isIOS ? 'Safari' : 'Chrome'}
                </strong>{' '}
                وليس داخل {appName}.
              </p>
            </div>

            {/* الميزات المفقودة */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {['📲 تثبيت التطبيق', '📷 مسح QR', '🔔 التنبيهات', '⚡ أداء كامل'].map(f => (
                <span
                  key={f}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    color: 'rgba(255,255,255,0.45)',
                    fontFamily: 'Cairo, system-ui, sans-serif',
                  }}
                >
                  {f}
                </span>
              ))}
            </div>

            {/* ─── الأزرار ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <CopyLinkButton />
              {isAndroid && <OpenInChromeButton />}
            </div>

            {/* ─── التعليمات ─── */}
            {isIOS
              ? <IOSInstructions appName={appName} />
              : <AndroidInstructions appName={appName} />
            }

            {/* زر التجاوز للمنظمين */}
            <button
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.2)',
                fontFamily: 'Cairo, system-ui, sans-serif',
                fontSize: '0.75rem',
                cursor: 'pointer',
                padding: '4px 0',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              المتابعة على أي حال (للمختصين)
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BrowserGate;
