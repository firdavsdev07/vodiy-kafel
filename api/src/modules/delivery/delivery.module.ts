import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DeliveryAdminService } from './delivery-admin.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryAdminController } from './delivery.admin.controller';
import { DeliveryService } from './delivery.service';

/**
 * Transport turlari, viloyatlar, tariflar (TZ 3.13): ochiq ro'yxatlar va
 * kalkulyator uchun tarif (B-027), admin CRUD (B-056).
 */
@Module({
  imports: [AuthModule],
  controllers: [DeliveryController, DeliveryAdminController],
  providers: [DeliveryService, DeliveryAdminService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
