import { Module } from '@nestjs/common';
import { ConditionalModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from './config';
import { PrismaModule } from './prisma';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CalculatorModule } from './modules/calculator/calculator.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { FactoriesModule } from './modules/factories/factories.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { DevPaymentsModule } from './modules/payments/dev/dev-payments.module';
import { PartnersModule } from './modules/partners/partners.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { ProductsModule } from './modules/products/products.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StaffModule } from './modules/staff/staff.module';
import { SizesModule } from './modules/sizes/sizes.module';
import { StorageModule } from './storage';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    // Biznes hodisalari → bildirishnomalar (B-037). Global.
    EventEmitterModule.forRoot(),
    StorageModule,
    AuthModule,
    SettingsModule,
    CustomersModule,
    FactoriesModule,
    SizesModule,
    ProductsModule,
    GalleryModule,
    PricingModule,
    DeliveryModule,
    CalculatorModule,
    OrdersModule,
    PaymentsModule,
    AccountsModule,
    NotificationsModule,
    BranchesModule,
    PartnersModule,
    StaffModule,
    // 🧪 /dev/* — faqat development. `validateEnv` standart qiymatlarni
    // process.env ga yozgani uchun NODE_ENV bu yerda doim aniqlangan.
    ConditionalModule.registerWhen(
      DevPaymentsModule,
      (env) => env.NODE_ENV === 'development',
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
