import { useCallback } from 'react';

/**
 * Hook للـ Badging API — يعرض عدد على أيقونة التطبيق في الشاشة الرئيسية
 * مدعوم على: Android Chrome, Edge, Samsung Internet
 * غير مدعوم: iOS Safari, Firefox
 */
export const useBadge = () => {
  const isSupported = 'setAppBadge' in navigator;

  /**
   * تحديث عدد الـ Badge
   * @param {number} count - العدد المطلوب عرضه (0 يمسح الـ badge)
   */
  const setBadge = useCallback(async (count) => {
    if (!isSupported) return;
    try {
      if (count === 0) {
        await navigator.clearAppBadge();
      } else {
        await navigator.setAppBadge(count);
      }
    } catch (err) {
      console.warn('Badge API error:', err);
    }
  }, [isSupported]);

  const clearBadge = useCallback(async () => {
    if (!isSupported) return;
    try {
      await navigator.clearAppBadge();
    } catch (err) {
      console.warn('Badge clear error:', err);
    }
  }, [isSupported]);

  return { isSupported, setBadge, clearBadge };
};
