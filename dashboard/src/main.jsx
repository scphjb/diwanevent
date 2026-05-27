import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css';
import './i18n';
import Swal, { showSuccess, showError, showConfirm } from './utils/swal';

// Expose utilities globally to prevent ReferenceErrors in some environments
window.showSuccess = showSuccess;
window.showError = showError;
window.showConfirm = showConfirm;

// تحويل التنبيهات التقليدية إلى SweetAlert2 بشكل عالمي
window.alert = (message) => {
  Swal.fire({
    title: 'تنبيه',
    text: message,
    icon: 'info',
    background: '#050B18',
    color: '#fff',
    confirmButtonColor: '#2A64EC',
    confirmButtonText: 'حسناً',
    customClass: {
      popup: 'rounded-[32px] border border-white/10 backdrop-blur-xl',
      title: 'text-white font-bold',
      confirmButton: 'rounded-2xl px-8 py-3'
    }
  });
};

window.confirm = (message) => {
  // ملاحظة: confirm التقليدي هو synchronous، لكن Swal هو asynchronous
  // هذه الرقعة ستعمل للرسائل البسيطة، ولكن للأفضل يفضل استخدام showConfirm البرمجي
  console.warn("استخدام confirm التقليدي مستحسن استبداله بـ showConfirm من src/utils/swal");
  return Swal.fire({
    title: 'تأكيد',
    text: message,
    icon: 'question',
    showCancelButton: true,
    background: '#050B18',
    color: '#fff',
    confirmButtonColor: '#2A64EC',
    cancelButtonColor: '#374151',
    confirmButtonText: 'تأكيد',
    cancelButtonText: 'إلغاء',
    customClass: {
      popup: 'rounded-[32px] border border-white/10 backdrop-blur-xl',
      title: 'text-white font-bold',
      confirmButton: 'rounded-2xl px-8 py-3',
      cancelButton: 'rounded-2xl px-8 py-3'
    }
  });
};

// تسجيل الـ Service Worker لضمان عمل الواجهات دون إنترنت (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered successfully with scope:', registration.scope);
      
      // الكشف عن التحديثات وتنبيه العميل لإعادة التثبيت
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.info('🔄 تحديث جديد متاح — يُنصح بإعادة تحميل الصفحة');
            }
          });
        }
      });
    } catch (error) {
      console.warn('⚠️ Service Worker registration failed:', error);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-[#050B18]" />}>
        <App />
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
