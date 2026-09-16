import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { FactoriesAdminController } from './factories.admin.controller';
import { FactoriesController } from './factories.controller';
import { FactoriesService } from './factories.service';

/**
 * Zavodlar (B-018) — katalogning birinchi moduli.
 *
 * `AuthModule` admin controller'dagi guard'lar uchun. Ochiq controller
 * hech qanday guard ishlatmaydi.
 */
@Module({
  imports: [AuthModule],
  controllers: [FactoriesController, FactoriesAdminController],
  providers: [FactoriesService],
  exports: [FactoriesService],
})
export class FactoriesModule {}
