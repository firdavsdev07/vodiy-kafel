import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { GalleryAdminController } from './gallery.admin.controller';
import { GalleryController } from './gallery.controller';
import { GalleryService } from './gallery.service';

/** Loyiha galereyasi (B-024). Fayl saqlash — global `StorageModule`. */
@Module({
  imports: [AuthModule],
  controllers: [GalleryController, GalleryAdminController],
  providers: [GalleryService],
})
export class GalleryModule {}
