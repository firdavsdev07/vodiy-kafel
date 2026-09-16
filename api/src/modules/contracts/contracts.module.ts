import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { CalculatorModule } from '../calculator/calculator.module';
import { ContractGeneratorService } from './contract-generator.service';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import {
  COMPANY_LOOKUP_PROVIDER,
  CONTRACT_DELIVERY_CHANNEL,
  MockCompanyLookupProvider,
  MockTelegramContractDelivery,
} from './providers';

/**
 * Shartnoma moduli (EPIC 10, B-045) — 🧪 mock, spike (B-044) natijasidan
 * qat'i nazar ishlaydi.
 *
 * Haqiqiy Didox.uz ulanganda — FAQAT shu ikki `provide` qatori almashadi:
 *   COMPANY_LOOKUP_PROVIDER  → yangi `DidoxCompanyLookupProvider`
 *   CONTRACT_DELIVERY_CHANNEL → haqiqiy Telegram bot integratsiyasi
 * `ContractsController`/`ContractsService` tegilmaydi.
 */
@Module({
  imports: [AuthModule, CalculatorModule],
  controllers: [ContractsController],
  providers: [
    ContractsService,
    ContractGeneratorService,
    { provide: COMPANY_LOOKUP_PROVIDER, useClass: MockCompanyLookupProvider },
    {
      provide: CONTRACT_DELIVERY_CHANNEL,
      useClass: MockTelegramContractDelivery,
    },
  ],
})
export class ContractsModule {}
