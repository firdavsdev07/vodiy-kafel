import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments.module';
import { DevPaymentsController } from './dev-payments.controller';

/**
 * 🧪 `/dev/payments/*` — faqat development (`app.module` dagi
 * `ConditionalModule`). Alohida modul: production'da controller umuman
 * ro'yxatdan o'tmasin.
 */
@Module({
  imports: [PaymentsModule],
  controllers: [DevPaymentsController],
})
export class DevPaymentsModule {}
