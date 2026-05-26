import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api/v1';

/**
 * Hook لإدارة Web Push Notifications في ديوان إيفنت
 * يتعامل مع: طلب الإذن، الاشتراك، إلغاء الاشتراك
 */
export const usePushNotifications = () => {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setSupported(isSupported);

    if (isSupported) {
      // تحقق من وجود اشتراك حالي
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setSubscription(sub);
        });
      });
    }
  }, []);

  /**
   * تحويل VAPID public key إلى Uint8Array
   */
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  };

  /**
   * طلب إذن التنبيهات والاشتراك
   */
  const subscribe = useCallback(async () => {
    if (!supported) return { success: false, reason: 'not_supported' };
    setLoading(true);

    try {
      // طلب الإذن
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        return { success: false, reason: 'denied' };
      }

      // الحصول على الـ VAPID public key من الـ backend
      const keyRes = await fetch(`${API_BASE}/notifications/vapid-public-key`);
      const { public_key } = await keyRes.json();

      // إنشاء الاشتراك
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      });

      // إرسال الاشتراك للـ backend للحفظ
      const token = localStorage.getItem('diwan_token');
      await fetch(`${API_BASE}/notifications/push-subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          user_agent: navigator.userAgent,
        }),
      });

      setSubscription(sub);
      return { success: true };
    } catch (err) {
      console.error('Push subscription error:', err);
      return { success: false, reason: 'error', error: err.message };
    } finally {
      setLoading(false);
    }
  }, [supported]);

  /**
   * إلغاء الاشتراك
   */
  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    setLoading(true);

    try {
      await subscription.unsubscribe();
      const token = localStorage.getItem('diwan_token');
      await fetch(`${API_BASE}/notifications/push-unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      setSubscription(null);
      setPermission('default');
    } catch (err) {
      console.error('Unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  return {
    supported,
    permission,
    subscription,
    loading,
    isSubscribed: !!subscription && permission === 'granted',
    subscribe,
    unsubscribe,
  };
};
