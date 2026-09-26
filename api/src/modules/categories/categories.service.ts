import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaService } from '../../prisma';
import { slugify } from '../../common/utils';
import {
  IMAGE_KINDS,
  requireFileKind,
  STORAGE_SERVICE,
  type StorageService,
  type UploadedFileData,
} from '../../storage';
import type {
  CategoryAdminResponseDto,
  CategoryPublicResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto';

/** Ochiq javobga chiqadigan maydonlar — boshqasi tanlanmaydi. */
const PUBLIC_SELECT = {
  id: true,
  name: true,
  nameEn: true,
  slug: true,
  tagline: true,
  description: true,
  coverImageUrl: true,
} as const;

/**
 * Ochiq javobdagi mahsulot soni — faqat vitrinada KO'RINADIGANLARI.
 *
 * Filtr [[products.service]] `visibilityWhere()` bilan bir xil bo'lishi
 * shart: aks holda "12 mahsulot" deb yozilgan toifani ochgan mijoz
 * kamroq mahsulot ko'radi (o'chirilgan zavodning mahsulotlari).
 */
const PUBLIC_WITH_COUNT_SELECT = {
  ...PUBLIC_SELECT,
  _count: {
    select: {
      products: { where: { isActive: true, factory: { isActive: true } } },
    },
  },
} as const;

/** Admin javobi: ochiq maydonlar + holat + bog'langan mahsulotlar soni. */
const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { products: true } },
} as const;

/**
 * Vitrina tartibi: avval admin qo'ygan `sortOrder`, teng bo'lsa alifbo.
 *
 * Ikkinchi mezon MAJBURIY — faqat `sortOrder` bo'yicha saralashda teng
 * qiymatli kategoriyalar tartibi Postgres ixtiyorida qoladi va sahifa har
 * yangilanganda joy almashishi mumkin ([[factories.service]] bilan bir xil).
 */
const ORDER: Prisma.CategoryOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { name: 'asc' },
];

type AdminRow = Prisma.CategoryGetPayload<{ select: typeof ADMIN_SELECT }>;
type PublicRow = Prisma.CategoryGetPayload<{
  select: typeof PUBLIC_WITH_COUNT_SELECT;
}>;

const CATEGORY_NOT_FOUND = 'Kategoriya topilmadi';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  /** Ochiq vitrina (TZ 3.8) — faqat FAOL kategoriyalar. */
  async findAllPublic(): Promise<CategoryPublicResponseDto[]> {
    const rows = await this.prisma.category.findMany({
      where: { isActive: true },
      select: PUBLIC_WITH_COUNT_SELECT,
      orderBy: ORDER,
    });
    return rows.map((row) => this.toPublicDto(row));
  }

  /** Bitta kategoriya — slug bo'yicha, faqat FAOL. */
  async findOneBySlug(slug: string): Promise<CategoryPublicResponseDto> {
    const row = await this.prisma.category.findFirst({
      where: { slug, isActive: true },
      select: PUBLIC_WITH_COUNT_SELECT,
    });
    if (!row) throw new NotFoundException(CATEGORY_NOT_FOUND);
    return this.toPublicDto(row);
  }

  /** Admin ro'yxati — o'chirilganlari ham ko'rinadi. */
  async findAllAdmin(): Promise<CategoryAdminResponseDto[]> {
    const rows = await this.prisma.category.findMany({
      select: ADMIN_SELECT,
      orderBy: ORDER,
    });
    return rows.map((row) => this.toAdminDto(row));
  }

  async create(dto: CreateCategoryDto): Promise<CategoryAdminResponseDto> {
    const slug = slugify(dto.name);

    if (!slug) {
      throw new ConflictException(
        'Nomdan URL yasab bo‘lmadi — kamida bitta harf yoki raqam bo‘lishi kerak',
      );
    }

    try {
      const row = await this.prisma.category.create({
        data: { ...dto, slug },
        select: ADMIN_SELECT,
      });
      return this.toAdminDto(row);
    } catch (error) {
      // Bazadagi unique cheklov — yagona ishonchli hakam (poyga sharoiti,
      // [[factories.service]] izohiga qara).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `"${dto.name}" nomi band (URL: ${slug}) — boshqa nom tanlang`,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryAdminResponseDto> {
    await this.assertExists(id);

    // `slug` ataylab yangilanmaydi — [[update-category.dto]] izohiga qara.
    const row = await this.prisma.category.update({
      where: { id },
      data: dto,
      select: ADMIN_SELECT,
    });
    return this.toAdminDto(row);
  }

  /** Soft delete — yozuv o'chirilmaydi, faqat `isActive: false`. */
  async softDelete(id: string): Promise<CategoryAdminResponseDto> {
    await this.assertExists(id);

    const row = await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
      select: ADMIN_SELECT,
    });
    return this.toAdminDto(row);
  }

  /** Muqova surati — eskisi yangisi saqlangandan KEYIN o'chiriladi ([[branches.service]] naqshi). */
  async uploadImage(
    id: string,
    file: UploadedFileData | undefined,
  ): Promise<CategoryAdminResponseDto> {
    const current = await this.prisma.category.findUnique({
      where: { id },
      select: { coverImageUrl: true },
    });
    if (!current) throw new NotFoundException(CATEGORY_NOT_FOUND);

    const { buffer, kind } = requireFileKind(
      file,
      IMAGE_KINDS,
      'Rasm faqat JPG, PNG yoki WEBP bo‘lishi mumkin',
    );

    const { url } = await this.storage.save({
      buffer,
      folder: 'categories',
      extension: kind,
    });

    let row: AdminRow;
    try {
      row = await this.prisma.category.update({
        where: { id },
        data: { coverImageUrl: url },
        select: ADMIN_SELECT,
      });
    } catch (error) {
      await this.removeFileQuietly(url);
      throw error;
    }

    if (current.coverImageUrl) {
      await this.removeFileQuietly(current.coverImageUrl);
    }
    return this.toAdminDto(row);
  }

  private async assertExists(id: string): Promise<void> {
    const found = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(CATEGORY_NOT_FOUND);
  }

  private async removeFileQuietly(url: string): Promise<void> {
    try {
      await this.storage.delete(url);
    } catch (error) {
      this.logger.warn(
        `Fayl o‘chmadi: ${url} — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Prisma `_count` ni javob shakliga o'tkazadi. */
  private toPublicDto(row: PublicRow): CategoryPublicResponseDto {
    const { _count, ...rest } = row;
    return { ...rest, productCount: _count.products };
  }

  /** Prisma `_count` ni javob shakliga o'tkazadi. */
  private toAdminDto(row: AdminRow): CategoryAdminResponseDto {
    const { _count, ...rest } = row;
    return { ...rest, productCount: _count.products };
  }
}
