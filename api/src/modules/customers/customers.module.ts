import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AccountsModule } from '../accounts/accounts.module';
import { PricingModule } from '../pricing/pricing.module';
import { CustomersAdminService } from './customers-admin.service';
import { CustomersAdminController } from './customers.admin.controller';
import { MeProfileController } from './me-profile.controller';
import { CustomersService } from './customers.service';

/**
 * Optom mijozlar moduli — admin tomoni: parol tiklash (B-017) va CRUD
 * (B-036). Mijoz kabinetidagi balans — AccountsModule (B-035).
 *
 * `AuthModule` parol hashlash uchun kerak (`AuthService.hashPassword`) —
 * bcrypt bilan ishlash bitta joyda qoladi.
 */
@Module({
  imports: [AuthModule, AccountsModule, PricingModule],
  controllers: [CustomersAdminController, MeProfileController],
  providers: [CustomersService, CustomersAdminService],
  exports: [CustomersService],
})
export class CustomersModule {}
