import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IMAGE_VARIANT_EXTENSION,
  renderImageVariants,
  variantSuffix,
} from './image-variants';
import {
  STORAGE_SERVICE,
  type StorageSaveInput,
  type StorageService,
  type StoredFile,
} from './storage.interface';

/**
 * Rasm yuklash — asl fayl + `srcset` variantlari (T-014).
 *
 * Rasm yuklaydigan har bir servis `StorageService.save` o'rniga SHUNI
 * chaqiradi. O'chirish esa oddiy `StorageService.delete` — u bog'liq
 * fayllarni (variantlarni) o'zi ham o'chiradi.
 *
 * Tartib: avval variantlar XOTIRADA yasaladi — rasm ochilmasa (400) diskka
 * hech narsa yozilmaydi. Keyin asl fayl, keyin variantlar; variant
 * saqlanmay qolsa asl fayl ham qaytarib o'chiriladi — yarim yozuv qolmasin.
 */
@Injectable()
export class ImageStorageService {
  private readonly logger = new Logger(ImageStorageService.name);

  constructor(
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async save(input: StorageSaveInput): Promise<StoredFile> {
    const variants = await renderImageVariants(input.buffer);
    const stored = await this.storage.save(input);

    try {
      for (const variant of variants) {
        await this.storage.saveDerived({
          of: stored.url,
          suffix: variantSuffix(variant.width),
          extension: IMAGE_VARIANT_EXTENSION,
          buffer: variant.buffer,
        });
      }
    } catch (error) {
      await this.storage
        .delete(stored.url)
        .catch((cleanup: unknown) =>
          this.logger.warn(
            `Yarim saqlangan rasmni o‘chirib bo‘lmadi: ${stored.url} — ${String(cleanup)}`,
          ),
        );
      throw error;
    }
    return stored;
  }
}
