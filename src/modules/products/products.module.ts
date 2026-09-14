import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

/**
 * Mahsulotlar — ochiq katalog (B-020).
 *
 * ⚠ `AuthModule` KERAK EMAS: bu yerdagi endpointlar butunlay ochiq.
 *   Admin tomoni va filial narxlari — B-021.
 */
@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
