import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { PaymentWebhookService } from './payment-webhook.service';
import {
  MockPaymentProvider,
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from './providers';

/**
 * 🧪 `PAYMENT_MOCK_AUTO_PAID=true` da mock provayderning soxta webhook'ini
 * haqiqiy qabul qiluvchiga ulaydi. Mock bo'lmagan provayderda — hech narsa
 * qilmaydi. Shu bog'lash shu yerda turgani uchun `PaymentWebhookService`
 * mock haqida hech narsa bilmaydi.
 */
@Injectable()
export class MockAutoPayService implements OnModuleInit {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly webhooks: PaymentWebhookService,
  ) {}

  onModuleInit(): void {
    if (this.provider instanceof MockPaymentProvider) {
      this.provider.onAutoPay((request) => this.webhooks.process(request));
    }
  }
}
