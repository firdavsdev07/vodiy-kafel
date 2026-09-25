import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AccountsModule } from '../accounts/accounts.module';
import { CalculatorModule } from '../calculator/calculator.module';
import {
  CustomerManagerOnlyStrategy,
  MANAGER_ASSIGNMENT_STRATEGY,
} from './manager-assignment';
import { MeManagerContactController } from './me-manager-contact.controller';
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
    MeManagerContactController,
    SupplyOrdersController,
    SupplyOrdersAdminController,
  ],
  providers: [
    OrdersService,
    OrderStatusService,
    OrdersAdminService,
    SupplyOrdersService,
    // ❓ Menejer biriktirish (B-043) — boshqa strategiya = shu qator.
    // T-007: avtomatik taqsimlash (BY_BRANCH) o'chirildi — faqat mijozning
    // o'z menejeri, bo'lmasa biriktirilmagan.
    {
      provide: MANAGER_ASSIGNMENT_STRATEGY,
      useClass: CustomerManagerOnlyStrategy,
    },
  ],
  exports: [OrdersService, OrderStatusService],
})
export class OrdersModule {}
