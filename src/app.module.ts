import { Module } from '@nestjs/common';
import { AppConfigModule } from './config';
import { PrismaModule } from './prisma';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { FactoriesModule } from './modules/factories/factories.module';
import { ProductsModule } from './modules/products/products.module';
import { SizesModule } from './modules/sizes/sizes.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    CustomersModule,
    FactoriesModule,
    SizesModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
