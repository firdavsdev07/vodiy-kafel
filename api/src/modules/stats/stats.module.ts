import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { StatsAdminController } from './stats.admin.controller';
import { StatsService } from './stats.service';

/**
 * Bosh sahifa statistikasi (B-063).
 *
 * `ProductsModule` — `ProductStocksService` uchun: zaxira holati filtri
 * SHU YERDA qayta yozilmaydi, ro'yxat bilan bitta manbadan olinadi.
 */
@Module({
  imports: [AuthModule, ProductsModule],
  controllers: [StatsAdminController],
  providers: [StatsService],
})
export class StatsModule {}
