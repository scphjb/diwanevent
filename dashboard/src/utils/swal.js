import Swal from 'sweetalert2';

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#022c22',
  color: '#fff',
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

export const showSuccess = (title, text = '') => {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    background: '#022c22',
    color: '#fff',
    confirmButtonColor: '#10b981',
    confirmButtonText: 'حسناً',
    customClass: {
      popup: 'rounded-[32px] border border-white/10 backdrop-blur-xl',
      title: 'text-white font-bold',
      confirmButton: 'rounded-2xl px-8 py-3'
    }
  });
};

export const showError = (title, text = '') => {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    background: '#022c22',
    color: '#fff',
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'إغلاق',
    customClass: {
      popup: 'rounded-[32px] border border-white/10 backdrop-blur-xl',
      title: 'text-white font-bold',
      confirmButton: 'rounded-2xl px-8 py-3'
    }
  });
};

export const showConfirm = (title, text = '', confirmText = 'تأكيد') => {
  return Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    background: '#022c22',
    color: '#fff',
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#374151',
    confirmButtonText: confirmText,
    cancelButtonText: 'إلغاء',
    customClass: {
      popup: 'rounded-[32px] border border-white/10 backdrop-blur-xl',
      title: 'text-white font-bold',
      confirmButton: 'rounded-2xl px-8 py-3',
      cancelButton: 'rounded-2xl px-8 py-3'
    }
  });
};

export const showToast = (title, icon = 'success') => {
  return toast.fire({
    icon,
    title
  });
};

export default Swal;
