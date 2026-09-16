import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AppConfigService } from '../../config';
import { AccountsModule } from '../accounts/accounts.module';
import { CalculatorModule } from '../calculator/calculator.module';
import { MockAutoPayService } from './mock-auto-pay.service';
import { PaymentSettlementService } from './payment-settlement.service';
import { PaymentWebhookController } from './payment-webhook.controller';
import { PaymentWebhookService } from './payment-webhook.service';
import { PaymentsAdminController } from './payments.admin.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import {
  MockPaymentProvider,
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from './providers';

/**
 * To'lov (EPIC 6).
 *
 * Provayder tanlovi FAQAT shu yerda (`PAYMENT_PROVIDER`). Haqiqiy
 * provayder (B-050) = yangi klass + `switch` ga bitta qator.
 */
@Module({
  imports: [AuthModule, CalculatorModule, AccountsModule],
  controllers: [
    PaymentsController,
    PaymentsAdminController,
    PaymentWebhookController,
  ],
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): PaymentProvider => {
        const { provider, mockAutoPaid } = config.payment;
        switch (provider) {
          case 'mock':
            return new MockPaymentProvider({ autoPaid: mockAutoPaid });
        }
      },
    },
    PaymentsService,
    PaymentSettlementService,
    PaymentWebhookService,
    MockAutoPayService,
  ],
  exports: [PAYMENT_PROVIDER, PaymentWebhookService],
})
export class PaymentsModule {}
