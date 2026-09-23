import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { CategoriesAdminController } from './categories.admin.controller';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

/**
 * Kategoriyalar (B-067) — mahsulot NIMA ekanini bildiradi (TZ 3.8).
 *
 * `AuthModule` admin controller'dagi guard'lar uchun. Muqova surati —
 * global `StorageModule` (Branches bilan bir xil).
 */
@Module({
  imports: [AuthModule],
  controllers: [CategoriesController, CategoriesAdminController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
