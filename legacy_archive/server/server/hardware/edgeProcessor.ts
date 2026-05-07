import { EventEmitter } from 'node:events';

export class EdgeProcessor extends EventEmitter {
  private localCache: Map<string, any> = new Map(); // في الإنتاج نستخدم LevelDB أو SQLite
  private syncQueue: any[] = [];
  private isOffline = false;

  constructor() {
    super();
    this.startSyncTimer();
  }

  /**
   * معالجة المسحة في الحافة (Edge) بسرعة فائقة
   */
  async processScan(deviceId: string, scanData: any) {
    const startTime = performance.now();

    // 1. تحقق سريع من التكرار (Deduplication) محلياً
    if (this.isDuplicate(scanData.qrCode)) {
      return { success: false, reason: 'DUPLICATE_SCAN' };
    }

    // 2. معالجة المنطق المحلي (Local Validation)
    const result = {
      participantId: scanData.qrCode.split('-')[1],
      timestamp: new Date().toISOString(),
      latency: `${(performance.now() - startTime).toFixed(2)}ms`
    };

    // 3. تخزين في قائمة المزامنة
    this.syncQueue.push({ deviceId, ...scanData, ...result });

    // 4. إطلاق حدث للتحديث اللحظي للخرائط الحرارية
    this.emit('scan.captured', result);

    return { success: true, ...result };
  }

  private isDuplicate(qrCode: string): boolean {
    if (this.localCache.has(qrCode)) return true;
    this.localCache.set(qrCode, Date.now());
    
    // تنظيف الكاش القديم كل فترة
    if (this.localCache.size > 50000) this.localCache.clear();
    return false;
  }

  private startSyncTimer() {
    setInterval(async () => {
      if (this.syncQueue.length > 0 && !this.isOffline) {
        await this.syncToCloud();
      }
    }, 1000); // مزامنة كل ثانية
  }

  private async syncToCloud() {
    const batch = this.syncQueue.splice(0, 1000); // معالجة 1000 سجل في الدفعة
    console.log(`☁️ Syncing ${batch.length} scans to cloud...`);
    
    try {
      // إرسال البيانات للسحابة (الـ API الرئيسي)
      // await fetch('https://api.diwan.event/sync', { ... });
      this.emit('device.sync_complete', { count: batch.length });
    } catch (error) {
      console.error('❌ Cloud sync failed, returning to queue');
      this.syncQueue.unshift(...batch);
      this.isOffline = true;
    }
  }
}
