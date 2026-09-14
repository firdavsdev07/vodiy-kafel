import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { CalculatorModule } from '../calculator/calculator.module';
import { MeOrdersController } from './me-orders.controller';
import { OrderStatusService } from './order-status.service';
import { OrderTrackingController } from './order-tracking.controller';
import { OrdersAdminController } from './orders.admin.controller';
import { OrdersAdminService } from './orders-admin.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

/** Buyurtmalar (EPIC 5). Summa — kalkulyator bilan bitta yo'l (B-027). */
@Module({
  imports: [AuthModule, CalculatorModule],
  controllers: [
    OrdersController,
    OrderTrackingController,
    OrdersAdminController,
    MeOrdersController,
  ],
  providers: [OrdersService, OrderStatusService, OrdersAdminService],
  exports: [OrdersService, OrderStatusService],
})
export class OrdersModule {}
