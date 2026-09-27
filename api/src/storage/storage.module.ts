import { Global, Module } from '@nestjs/common';
import { AppConfigService } from '../config';
import { ImageStorageService } from './image-storage.service';
import { LocalDiskStorage } from './local-disk.storage';
import { STORAGE_SERVICE } from './storage.interface';

/**
 * Fayl saqlash (B-022). Global — mahsulot, filial va hamkor rasmlari
 * bitta mexanizmdan o'tadi (B-041, B-042).
 *
 * Boshqa provayderga o'tish = shu yerdagi `useFactory` ni almashtirish.
 */
@Global()
@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        new LocalDiskStorage(config.uploadDir),
    },
    ImageStorageService,
  ],
  exports: [STORAGE_SERVICE, ImageStorageService],
})
export class StorageModule {}
