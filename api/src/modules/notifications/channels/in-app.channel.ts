import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import type {
  NotificationChannel,
  NotificationMessage,
  NotificationRecipient,
} from './notification-channel.interface';

/**
 * Kabinet / admin panel ichidagi bildirishnoma — `notifications` jadvali
 * (header'dagi «+1» hisoblagichi shu yerdan, B-038).
 *
 * Qabul qiluvchi ANIQ BITTA: mijoz YOKI xodim (baza CHECK, B-012).
 * Hisobsiz xaridor (telefon buyurtmasi) — bu kanalga tushmaydi.
 */
@Injectable()
export class InAppChannel implements NotificationChannel {
  readonly name = 'in-app';

  constructor(private readonly prisma: PrismaService) {}

  async send(
    recipient: NotificationRecipient,
    message: NotificationMessage,
  ): Promise<void> {
    const target = recipient.customerId
      ? { customerId: recipient.customerId }
      : recipient.userId
        ? { userId: recipient.userId }
        : null;
    if (!target) return;

    await this.prisma.notification.create({
      data: {
        ...target,
        type: message.type,
        title: message.title,
        body: message.body,
        payload: message.payload,
        imageUrl: message.imageUrl ?? null,
      },
    });
  }
}
