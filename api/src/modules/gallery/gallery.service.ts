import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { Prisma, PrismaService } from '../../prisma';
import {
  IMAGE_KINDS,
  requireFileKind,
  STORAGE_SERVICE,
  type StorageService,
  type UploadedFileData,
} from '../../storage';
import type {
  CreateGalleryItemDto,
  GalleryAdminItemDto,
  GalleryAdminQueryDto,
  GalleryPublicItemDto,
  UpdateGalleryItemDto,
} from './dto';

const ADMIN_SELECT = {
  id: true,
  imageUrl: true,
  title: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  product: { select: { id: true, name: true, slug: true, isActive: true } },
} as const;

/**
 * Tartib: admin raqami, teng bo'lsa yangisi oldinda, oxirida `id` —
 * sahifalashda rasm ikki sahifada chiqib qolmasligi uchun.
 */
const ORDER: Prisma.GalleryItemOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { createdAt: 'desc' },
  { id: 'asc' },
];

const GALLERY_NOT_FOUND = 'Galereya rasmi topilmadi';

/**
 * Loyiha galereyasi — "ishlarimiz" (B-024, TZ 3.1).
 *
 * Galereya umumiy (filialga bog'lanmagan), yozish faqat SUPER_ADMIN.
 */
@Injectable()
export class GalleryService {
  private readonly logger = new Logger(GalleryService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  /**
   * 🔒 Mahsulot havolasi faqat u OCHIQ vitrinada ko'rinsa beriladi —
   *    aks holda o'chirilgan mahsulotning nomi galereya orqali sizib
   *    chiqardi va havola 404 ga olib borardi. Rasmning o'zi qoladi.
   */
  async findPublic(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<GalleryPublicItemDto>> {
    const where = { isActive: true };

    const [total, rows] = await Promise.all([
      this.prisma.galleryItem.count({ where }),
      this.prisma.galleryItem.findMany({
        where,
        select: {
          id: true,
          imageUrl: true,
          title: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
              factory: { select: { isActive: true } },
            },
          },
        },
        orderBy: ORDER,
        skip: query.skip,
        take: query.take,
      }),
    ]);

    return paginate(
      rows.map(({ product, ...item }) => ({
        ...item,
        product:
          product?.isActive && product.factory.isActive
            ? { id: product.id, name: product.name, slug: product.slug }
            : null,
      })),
      total,
      query,
    );
  }

  async findAdmin(
    query: GalleryAdminQueryDto,
  ): Promise<PaginatedResult<GalleryAdminItemDto>> {
    const where: Prisma.GalleryItemWhereInput = {
      ...(query.productId && { productId: query.productId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };

    const [total, items] = await Promise.all([
      this.prisma.galleryItem.count({ where }),
      this.prisma.galleryItem.findMany({
        where,
        select: ADMIN_SELECT,
        orderBy: ORDER,
        skip: query.skip,
        take: query.take,
      }),
    ]);

    return paginate(items, total, query);
  }

  async create(
    file: UploadedFileData | undefined,
    dto: CreateGalleryItemDto,
  ): Promise<GalleryAdminItemDto> {
    const { buffer, kind } = requireFileKind(
      file,
      IMAGE_KINDS,
      'Rasm faqat JPG, PNG yoki WEBP bo‘lishi mumkin',
    );
    if (dto.productId) await this.requireProduct(dto.productId);

    const { url } = await this.storage.save({
      buffer,
      folder: 'gallery',
      extension: kind,
    });

    try {
      return await this.prisma.galleryItem.create({
        data: { ...dto, imageUrl: url },
        select: ADMIN_SELECT,
      });
    } catch (error) {
      await this.removeFileQuietly(url);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateGalleryItemDto,
  ): Promise<GalleryAdminItemDto> {
    await this.assertExists(id);
    if (dto.productId) await this.requireProduct(dto.productId);

    return this.prisma.galleryItem.update({
      where: { id },
      data: dto,
      select: ADMIN_SELECT,
    });
  }

  /**
   * Haqiqiy o'chirish (soft emas): galereya rasmiga hech narsa bog'lanmagan,
   * saqlab qo'yishning ma'nosi yo'q. Yashirish uchun — `isActive: false`.
   */
  async remove(id: string): Promise<GalleryAdminItemDto> {
    const item = await this.prisma.galleryItem.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!item) throw new NotFoundException(GALLERY_NOT_FOUND);

    await this.prisma.galleryItem.delete({ where: { id } });
    await this.removeFileQuietly(item.imageUrl);
    return item;
  }

  /** Body'dagi havola xato — 400 (so'ralgan resurs emas, maydon xato). */
  private async requireProduct(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new BadRequestException('Mahsulot topilmadi');
  }

  private async assertExists(id: string): Promise<void> {
    const found = await this.prisma.galleryItem.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(GALLERY_NOT_FOUND);
  }

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
