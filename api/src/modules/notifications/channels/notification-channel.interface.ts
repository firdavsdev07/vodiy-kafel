import type { NotificationType } from '../../../common/enums';

/**
 * Xabar kimga — kanalga kerak bo'lishi mumkin bo'lgan manzillar bilan.
 *
 * Har kanal O'ZIGA kerakli maydon bo'lmasa, qabul qiluvchini jimgina
 * o'tkazib yuboradi (Telegram — `telegramUsername` siz, SMS — `phone` siz).
 * Shuning uchun "kimga qaysi kanal" qarori manzil to'ldirilishi orqali
 * `NotificationService` da, kanal ichida emas.
 */
export interface NotificationRecipient {
  /** Kabinet (in-app) — optom mijoz. */
  customerId?: string;
  /** Admin panel (in-app) — xodim. */
  userId?: string;
  telegramUsername?: string | null;
  phone?: string | null;
}

export interface NotificationMessage {
  type: NotificationType;
  title: string;
  body: string;
  /** Bosilganda qayerga: `{ orderId }` yoki `{ productId }`. */
  payload?: Record<string, string>;
}

/**
 * Bildirishnoma kanali (B-037). Yangi kanal (push, e-mail) = yangi klass +
 * `notifications.module` dagi ro'yxatga bitta qator; biznes-servis va
 * boshqa kanallarga tegilmaydi.
 */
export interface NotificationChannel {
  readonly name: string;
  send(
    recipient: NotificationRecipient,
    message: NotificationMessage,
  ): Promise<void>;
}

/** Joylashuv yubora oladigan kanal (TZ 3.13 — mijoz xaritada belgilagan nuqta). */
export interface LocationCapableChannel extends NotificationChannel {
  sendLocation(
    recipient: NotificationRecipient,
    latitude: number,
    longitude: number,
  ): Promise<void>;
}

export const isLocationCapable = (
  channel: NotificationChannel,
): channel is LocationCapableChannel =>
  typeof (channel as Partial<LocationCapableChannel>).sendLocation ===
  'function';

/** DI tokeni — barcha kanallar massivi. */
export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');
