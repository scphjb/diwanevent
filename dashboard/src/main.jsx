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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-[#050B18]" />}>
        <App />
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
