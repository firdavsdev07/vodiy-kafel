import { Injectable, Logger } from '@nestjs/common';
import type {
  LocationCapableChannel,
  NotificationMessage,
  NotificationRecipient,
} from './notification-channel.interface';

/**
 * 🧪 Telegram kanali — MOCK: faqat logga yozadi (B-037).
 *
 * Haqiqiysi (bot token, chat ID) ulanganda — yangi klass shu interfeys
 * bilan; `notifications.module` dagi bitta qator almashadi.
 *
 * ❓ Hozir xodimda faqat `telegramUsername` bor. Bot username'ga o'zi yoza
 *    olmaydi — foydalanuvchi botni /start qilgach chat ID saqlanishi kerak.
 *    Bu haqiqiy integratsiya bilan birga hal qilinadi.
 */
@Injectable()
export class MockTelegramChannel implements LocationCapableChannel {
  readonly name = 'telegram';
  private readonly logger = new Logger('TelegramChannel(mock)');

  send(
    recipient: NotificationRecipient,
    message: NotificationMessage,
  ): Promise<void> {
    if (recipient.telegramUsername) {
      this.logger.log(
        `→ @${recipient.telegramUsername}: ${message.title} — ${message.body}`,
      );
    }
    return Promise.resolve();
  }

  sendLocation(
    recipient: NotificationRecipient,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    if (recipient.telegramUsername) {
      this.logger.log(
        `→ @${recipient.telegramUsername}: 📍 ${latitude}, ${longitude}`,
      );
    }
    return Promise.resolve();
  }
}
