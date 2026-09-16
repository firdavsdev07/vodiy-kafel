import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { BranchProductsAdminController } from './branch-products.admin.controller';
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
  imports: [AuthModule],
  controllers: [
    ProductsController,
    ProductsAdminController,
    BranchProductsAdminController,
    ProductStocksAdminController,
    ProductMediaAdminController,
  ],
  providers: [
    ProductsService,
    ProductsAdminService,
    BranchProductsService,
    ProductStocksService,
    ProductMediaService,
    SimilarProductsService,
  ],
  exports: [ProductsService, BranchProductsService, ProductStocksService],
})
export class ProductsModule {}
