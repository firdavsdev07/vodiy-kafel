import { Module } from '@nestjs/common';
import { AppConfigModule } from './config';
import { PrismaModule } from './prisma';
import { AuthModule } from './auth/auth.module';
import { CalculatorModule } from './modules/calculator/calculator.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { FactoriesModule } from './modules/factories/factories.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { ProductsModule } from './modules/products/products.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SizesModule } from './modules/sizes/sizes.module';
import { StorageModule } from './storage';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
