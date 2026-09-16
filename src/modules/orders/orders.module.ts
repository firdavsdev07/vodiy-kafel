import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AccountsModule } from '../accounts/accounts.module';
import { CalculatorModule } from '../calculator/calculator.module';
import {
  ByBranchAssignmentStrategy,
  MANAGER_ASSIGNMENT_STRATEGY,
} from './manager-assignment';
import { MeOrdersController } from './me-orders.controller';
import { OrderStatusService } from './order-status.service';
import { OrderTrackingController } from './order-tracking.controller';
import { OrdersAdminController } from './orders.admin.controller';
import { OrdersAdminService } from './orders-admin.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SupplyOrdersAdminController } from './supply-orders.admin.controller';
import { SupplyOrdersController } from './supply-orders.controller';
import { SupplyOrdersService } from './supply-orders.service';

/** Buyurtmalar (EPIC 5). Summa — kalkulyator bilan bitta yo'l (B-027). */
@Module({
  imports: [AuthModule, CalculatorModule, AccountsModule],
  controllers: [
    OrdersController,
    OrderTrackingController,
    OrdersAdminController,
    MeOrdersController,
    SupplyOrdersController,
    SupplyOrdersAdminController,
  ],
  providers: [
    OrdersService,
    OrderStatusService,
    OrdersAdminService,
    SupplyOrdersService,
    // ❓ Menejer biriktirish (B-043) — boshqa strategiya = shu qator.
    {
      provide: MANAGER_ASSIGNMENT_STRATEGY,
      useClass: ByBranchAssignmentStrategy,
    },
  ],
  exports: [OrdersService, OrderStatusService],
})
export class OrdersModule {}
