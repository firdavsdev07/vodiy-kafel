import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { CalculatorModule } from '../calculator/calculator.module';
import { PricingModule } from '../pricing/pricing.module';
import { SettingsModule } from '../settings/settings.module';
import { BranchProductsAdminController } from './branch-products.admin.controller';
import { CustomerCatalogService } from './customer-catalog.service';
import { MeCatalogController } from './me-catalog.controller';
import { BranchProductsService } from './branch-products.service';
import { ProductMediaAdminController } from './product-media.admin.controller';
import { ProductMediaService } from './product-media.service';
import { ProductStocksAdminController } from './product-stocks.admin.controller';
import { ProductStocksService } from './product-stocks.service';
import { ProductsAdminService } from './products-admin.service';
import { ProductsAdminController } from './products.admin.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SimilarProductsService } from './similar-products.service';

/**
 * Mahsulotlar: ochiq katalog (B-020) va admin tomoni — katalog, filial
 * narxlari, markaziy ombor zaxirasi (B-021), media (B-022), o'xshash
 * mahsulotlar (B-023).
 *
 * `AuthModule` admin controller'lar uchun: guard'lar va `BranchScopeService`.
 */
@Module({
  // `CalculatorModule` — kabinet katalogi (B-064) mijoz kontekstini
  // `QuoteService.requireCustomer` orqali oladi: token filiali bazadagi
  // bilan solishtiriladi. Kalkulyator va buyurtma ham SHU tekshiruvdan
  // o'tadi — ikkinchi nusxa yozilsa, ular vaqt o'tib farq qila boshlardi.
  imports: [AuthModule, CalculatorModule, PricingModule, SettingsModule],
  controllers: [
    ProductsController,
    MeCatalogController,
    ProductsAdminController,
    BranchProductsAdminController,
    ProductStocksAdminController,
    ProductMediaAdminController,
  ],
  providers: [
    ProductsService,
    CustomerCatalogService,
    ProductsAdminService,
    BranchProductsService,
    ProductStocksService,
    ProductMediaService,
    SimilarProductsService,
  ],
  exports: [ProductsService, BranchProductsService, ProductStocksService],
})
export class ProductsModule {}
