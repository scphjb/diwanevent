import { WebhookWorker } from '../workers/webhookWorker';

/**
 * المحرك الأساسي للنظام
 */
export async function initializeCore() {
  console.log('🏗️  Initializing Diwan Core Systems...');

  // 1. تشغيل محرك الـ Webhooks في الخلفية
  const webhookWorker = new WebhookWorker();
  webhookWorker.start().catch(err => {
    console.error('🛑 Failed to start Webhook Worker:', err);
  });

  // يمكن إضافة محركات أخرى هنا مستقبلاً (e.g. Analytics, Cache Purger)
}

// تشغيل التهيئة عند استدعاء هذا الملف
if (require.main === module) {
  initializeCore();
}
