import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — إضافة JWT Token لكل طلب
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('diwan_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// متغير لمنع طلبات Refresh متعددة في نفس الوقت
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Response interceptor — تجديد Token تلقائي عند 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // إذا كان الخطأ 401 ولم نكن في طلب refresh سابق
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('diwan_refresh_token');

      // إذا لم يكن هناك refresh token — تسجيل خروج
      if (!refreshToken) {
        localStorage.removeItem('diwan_token');
        localStorage.removeItem('diwan_refresh_token');
        localStorage.removeItem('diwan_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // إذا كنا بالفعل في عملية refresh — أضف الطلب للقائمة
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post('/api/v1/auth/refresh', {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefresh, user } = res.data;

        // تحديث التوكنات
        localStorage.setItem('diwan_token', access_token);
        localStorage.setItem('diwan_refresh_token', newRefresh);
        localStorage.setItem('diwan_user', JSON.stringify(user));

        // إعادة تنفيذ الطلبات المعلقة
        processQueue(null, access_token);

        // إعادة تنفيذ الطلب الأصلي
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // فشل التجديد — تسجيل خروج
        localStorage.removeItem('diwan_token');
        localStorage.removeItem('diwan_refresh_token');
        localStorage.removeItem('diwan_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
