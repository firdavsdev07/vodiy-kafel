import { Injectable, Logger } from '@nestjs/common';
import type {
  ContractDeliveryChannel,
  ContractDeliveryData,
  ContractRecipient,
} from './contract-delivery.interface';

/**
 * 🧪 Shartnomani Telegram orqali "yuborish" — faqat log (B-045).
 *
 * Haqiqiy bot ulanganda (chat ID saqlash UX'i alohida hal qilinadi —
 * TZ 7-bo'lim ochiq savoli) shu klass o'rniga yangi klass yoziladi;
 * `ContractsService` o'zgarmaydi.
 */
@Injectable()
export class MockTelegramContractDelivery implements ContractDeliveryChannel {
  private readonly logger = new Logger('ContractDelivery(mock, Telegram)');

  send(
    recipient: ContractRecipient,
    contract: ContractDeliveryData,
  ): Promise<void> {
    this.logger.log(
      `🧪 Shartnoma #${contract.contractId} "${recipient.companyName}" ` +
        `(${recipient.phone}) ga Telegram orqali yuborildi (mock) — ` +
        `${contract.downloadPath}`,
    );
    return Promise.resolve();
  }
}
