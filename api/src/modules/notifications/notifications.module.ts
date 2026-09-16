import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { InAppChannel } from './channels/in-app.channel';
import { MockSmsChannel } from './channels/mock-sms.channel';
import { MockTelegramChannel } from './channels/mock-telegram.channel';
import { NOTIFICATION_CHANNELS } from './channels/notification-channel.interface';
import { MeNotificationsController } from './me-notifications.controller';
import { MeUpdatesController } from './me-updates.controller';
import { NotificationService } from './notification.service';
import { NotificationsInboxService } from './notifications-inbox.service';
import { UpdatesService } from './updates.service';

/**
 * Bildirishnomalar (EPIC 8).
 *
 * Kanallar ro'yxati FAQAT shu yerda. Haqiqiy Telegram/SMS yoki push =
 * yangi klass + shu massivdagi bitta qator.
 */
@Module({
  imports: [AuthModule],
  controllers: [MeNotificationsController, MeUpdatesController],
  providers: [
    NotificationsInboxService,
    UpdatesService,
    InAppChannel,
    MockTelegramChannel,
    MockSmsChannel,
    {
      provide: NOTIFICATION_CHANNELS,
      inject: [InAppChannel, MockTelegramChannel, MockSmsChannel],
      useFactory: (...channels: unknown[]) => channels,
    },
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
