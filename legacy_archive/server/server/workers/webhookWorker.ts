import crypto from 'node:crypto';
import { prisma } from '../_core/db'; // نفترض وجود prisma كـ ORM

const MAX_RETRIES = 5;
const BATCH_SIZE = 100;

export class WebhookWorker {
  private isRunning = false;

  /**
   * تشغيل المحرك في دورة مستمرة
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🚀 Webhook Delivery Engine started...');

    while (this.isRunning) {
      try {
        await this.processBatch();
        // انتظار لمدة 5 ثوانٍ قبل التحقق من وجود أحداث جديدة
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error('❌ Error in WebhookWorker loop:', error);
      }
    }
  }

  /**
   * معالجة دفعة من الأحداث
   */
  private async processBatch() {
    const events = await prisma.webhookEvent.findMany({
      where: {
        status: 'PENDING',
        nextRetryAt: { lte: new Date() },
        retryCount: { lt: MAX_RETRIES },
      },
      take: BATCH_SIZE,
      include: { webhook: true },
    });

    if (events.length === 0) return;

    console.log(`📦 Processing ${events.length} webhook events...`);

    const tasks = events.map((event: any) => this.deliverEvent(event));
    await Promise.allSettled(tasks);
  }

  /**
   * محرك التوصيل الفعلي
   */
  private async deliverEvent(event: any) {
    const { webhook, payload, eventType } = event;

    if (!webhook || !webhook.isActive) {
      await this.markAsFailed(event.id, 'Webhook target inactive or not found');
      return;
    }

    // 1. توليد التوقيع الرقمي (HMAC-SHA256) للأمان
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Diwan-Event': eventType,
          'X-Diwan-Signature': signature,
          'X-Idempotency-Key': event.id.toString(),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // مهلة زمنية 10 ثوانٍ
      });

      if (response.ok) {
        await this.markAsCompleted(event.id);
        console.log(`✅ Event ${event.id} delivered to ${webhook.url}`);
      } else {
        throw new Error(`Remote server responded with ${response.status}`);
      }
    } catch (error: any) {
      await this.handleRetry(event);
      console.warn(`⚠️ Delivery failed for event ${event.id}: ${error.message}`);
    }
  }

  private async markAsCompleted(id: string) {
    await prisma.webhookEvent.update({
      where: { id },
      data: { status: 'COMPLETED', processedAt: new Date() },
    });
  }

  private async handleRetry(event: any) {
    const nextRetryCount = event.retryCount + 1;
    
    // حساب وقت إعادة المحاولة الأسية (Exponential Backoff)
    // 1 -> 5m, 2 -> 30m, 3 -> 2h, 4 -> 6h, 5 -> 24h
    const backoffMinutes = [5, 30, 120, 360, 1440];
    const nextRetryAt = new Date(Date.now() + backoffMinutes[nextRetryCount - 1] * 60000);

    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: {
        retryCount: nextRetryCount,
        nextRetryAt,
        status: nextRetryCount >= MAX_RETRIES ? 'FAILED' : 'PENDING',
      },
    });
  }

  private async markAsFailed(id: string, reason: string) {
    await prisma.webhookEvent.update({
      where: { id },
      data: { status: 'FAILED', errorLog: reason },
    });
  }
}
