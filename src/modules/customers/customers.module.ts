import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { CustomersAdminController } from './customers.admin.controller';
import { CustomersService } from './customers.service';

/**
 * Optom mijozlar moduli.
 *
 * Hozircha faqat admin tomoni: parol tiklash (B-017). Mijoz kabineti
 * (profil, balans) — B-018+, to'liq CRUD — B-036.
 *
 * `AuthModule` parol hashlash uchun kerak (`AuthService.hashPassword`) —
 * bcrypt bilan ishlash bitta joyda qoladi.
 */
@Module({
  imports: [AuthModule],
  controllers: [CustomersAdminController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
