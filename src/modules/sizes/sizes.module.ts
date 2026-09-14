import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SizesAdminController } from './sizes.admin.controller';
import { SizesController } from './sizes.controller';
import { SizesService } from './sizes.service';

/** O'lchamlar (B-019) — katalog filtri uchun ma'lumotnoma. */
@Module({
  imports: [AuthModule],
  controllers: [SizesController, SizesAdminController],
  providers: [SizesService],
  exports: [SizesService],
})
export class SizesModule {}
