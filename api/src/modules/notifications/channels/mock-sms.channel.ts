import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationChannel,
  NotificationMessage,
  NotificationRecipient,
} from './notification-channel.interface';

/**
 * 🧪 SMS kanali — MOCK: faqat logga yozadi (B-037).
 *
 * ⚠ SMS pullik. Shuning uchun `NotificationService` telefonni faqat
 *   kabineti YO'Q xaridorga (telefon/Telegram orqali kelgan buyurtma)
 *   beradi — optom mijoz kabinetda ko'radi.
 */
@Injectable()
export class MockSmsChannel implements NotificationChannel {
  readonly name = 'sms';
  private readonly logger = new Logger('SmsChannel(mock)');

  send(
    recipient: NotificationRecipient,
    message: NotificationMessage,
  ): Promise<void> {
    if (recipient.phone) {
      this.logger.log(`→ ${recipient.phone}: ${message.body}`);
    }
    return Promise.resolve();
  }
}
