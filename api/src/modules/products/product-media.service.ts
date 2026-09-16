import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MediaType, PrismaService } from '../../prisma';
import {
  IMAGE_KINDS,
  requireFileKind,
  STORAGE_SERVICE,
  VIDEO_KINDS,
  type FileKind,
  type StorageService,
  type UploadedFileData,
} from '../../storage';
import type { ProductMediaAdminResponseDto } from './dto';

const SELECT = {
  id: true,
  productId: true,
  url: true,
  type: true,
  sortOrder: true,
  createdAt: true,
} as const;

const ALLOWED_KINDS: Record<MediaType, readonly FileKind[]> = {
  IMAGE: IMAGE_KINDS,
  IMAGE_360: IMAGE_KINDS,
  VIDEO_360: VIDEO_KINDS,
};

/**
 * Mahsulot media fayllari — surat, 360° surat, 360° video (B-022, TZ 3.1).
 *
 * Media — umumiy katalog qismi, filialga bog'lanmagan.
 */
@Injectable()
export class ProductMediaService {
  private readonly logger = new Logger(ProductMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async findAll(productId: string): Promise<ProductMediaAdminResponseDto[]> {
    await this.assertProductExists(productId);
    return this.prisma.productMedia.findMany({
      where: { productId },
      select: SELECT,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async upload(
    productId: string,
    file: UploadedFileData | undefined,
    type: MediaType = MediaType.IMAGE,
  ): Promise<ProductMediaAdminResponseDto> {
    const { buffer, kind } = requireFileKind(
      file,
      ALLOWED_KINDS[type],
      type === MediaType.VIDEO_360
        ? '360° video faqat MP4 bo‘lishi mumkin'
        : 'Surat faqat JPG, PNG yoki WEBP bo‘lishi mumkin',
    );
    await this.assertProductExists(productId);

    const { url } = await this.storage.save({
      buffer,
      folder: 'products',
      extension: kind,
    });

    try {
      const last = await this.prisma.productMedia.aggregate({
        where: { productId },
        _max: { sortOrder: true },
      });
      return await this.prisma.productMedia.create({
        data: {
          productId,
          url,
          type,
          sortOrder: (last._max.sortOrder ?? -1) + 1,
        },
        select: SELECT,
      });
    } catch (error) {
      // Yozuv bazaga tushmadi — diskda egasiz fayl qolmasin.
      await this.removeFileQuietly(url);
      throw error;
    }
  }

  /**
   * Avval bazadagi yozuv, keyin fayl o'chiriladi: teskari tartibda fayl
   * o'chib, baza xato bersa, katalogda "singan" surat qolib ketardi.
   */
  async remove(mediaId: string): Promise<ProductMediaAdminResponseDto> {
    const media = await this.prisma.productMedia.findUnique({
      where: { id: mediaId },
      select: SELECT,
    });
    if (!media) throw new NotFoundException('Media topilmadi');

    await this.prisma.productMedia.delete({ where: { id: mediaId } });
    await this.removeFileQuietly(media.url);
    return media;
  }

  /**
   * Tartibni almashtiradi.
   *
   * Ro'yxat mahsulotning HAMMA media fayllarini aniq bir martadan o'z ichiga
   * olishi shart. Qisman ro'yxat qabul qilinsa, qolganlari eski raqamlari
   * bilan yangilari orasiga aralashib ketardi; begona ID esa boshqa
   * mahsulot suratini ko'chirib yuborardi.
   */
  async reorder(
    productId: string,
    mediaIds: string[],
  ): Promise<ProductMediaAdminResponseDto[]> {
    await this.assertProductExists(productId);

    const existing = await this.prisma.productMedia.findMany({
      where: { productId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));

    if (
      mediaIds.length !== existingIds.size ||
      !mediaIds.every((id) => existingIds.has(id))
    ) {
      throw new BadRequestException(
        'Ro‘yxatda mahsulotning barcha media fayllari aynan bir martadan bo‘lishi kerak',
      );
    }

    await this.prisma.$transaction(
      mediaIds.map((id, index) =>
        this.prisma.productMedia.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.findAll(productId);
  }

  private async assertProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');
  }

  /** Fayl o'chmasa — so'rov muvaffaqiyatsiz bo'lmaydi, faqat log. */
  private async removeFileQuietly(url: string): Promise<void> {
    try {
      await this.storage.delete(url);
    } catch (error) {
      this.logger.warn(
        `Faylni o‘chirib bo‘lmadi: ${url} — ${(error as Error).message}`,
      );
    }
  }
}
