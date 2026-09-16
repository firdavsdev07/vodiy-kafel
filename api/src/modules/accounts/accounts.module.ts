import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { CalculatorModule } from '../calculator/calculator.module';
import { AccountLedgerService } from './account-ledger.service';
import { AccountsAdminController } from './accounts.admin.controller';
import { AccountsService } from './accounts.service';
import { MeAccountController } from './me-account.controller';

/**
 * Mijoz hisobi va tranzaksiyalar (EPIC 7).
 *
 * `AccountLedgerService` — hisobga yozishning yagona joyi; buyurtma va
 * to'lov modullari shu modulni import qiladi.
 */
@Module({
  imports: [AuthModule, CalculatorModule],
  controllers: [MeAccountController, AccountsAdminController],
  providers: [AccountLedgerService, AccountsService],
  exports: [AccountLedgerService, AccountsService],
})
export class AccountsModule {}
