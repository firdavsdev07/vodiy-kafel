import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaService } from '../../prisma';
import { slugify } from '../../common/utils';
import type {
  CreateFactoryDto,
  FactoryAdminResponseDto,
  FactoryPublicResponseDto,
  UpdateFactoryDto,
} from './dto';

/** Ochiq javobga chiqadigan maydonlar — boshqasi tanlanmaydi. */
const PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  description: true,
  websiteUrl: true,
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
 * qiymatli zavodlar tartibi Postgres ixtiyorida qoladi va sahifa har
 * yangilanganda joy almashishi mumkin.
 */
const ORDER: Prisma.FactoryOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { name: 'asc' },
];

type AdminRow = Prisma.FactoryGetPayload<{ select: typeof ADMIN_SELECT }>;

@Injectable()
export class FactoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ochiq vitrina (TZ 3.8) — faqat FAOL zavodlar.
   *
   * ⚠ Zavod filialga bog'lanmagan: u butun tizim uchun umumiy katalog
   *   ma'lumoti, shuning uchun bu yerda `BranchScopeService` (B-051)
   *   QO'LLANMAYDI. Filialga bog'liq narsa — narx, u `BranchProduct` da.
   */
  async findAllPublic(): Promise<FactoryPublicResponseDto[]> {
    return this.prisma.factory.findMany({
      where: { isActive: true },
      select: PUBLIC_SELECT,
      orderBy: ORDER,
    });
  }

  /** Admin ro'yxati — o'chirilganlari ham ko'rinadi. */
  async findAllAdmin(): Promise<FactoryAdminResponseDto[]> {
    const rows = await this.prisma.factory.findMany({
      select: ADMIN_SELECT,
      orderBy: ORDER,
    });
    return rows.map((row) => this.toAdminDto(row));
  }

  async create(dto: CreateFactoryDto): Promise<FactoryAdminResponseDto> {
    const slug = slugify(dto.name);

    // Nom bo'sh bo'lmasa ham slug bo'sh chiqishi mumkin (masalan faqat
    // tinish belgilaridan iborat nom) — bunday yozuv katalog manzilini
    // buzardi, shuning uchun oldindan rad etamiz.
    if (!slug) {
      throw new ConflictException(
        'Nomdan URL yasab bo‘lmadi — kamida bitta harf yoki raqam bo‘lishi kerak',
      );
    }

    try {
      const row = await this.prisma.factory.create({
        data: { ...dto, slug },
        select: ADMIN_SELECT,
      });
      return this.toAdminDto(row);
    } catch (error) {
      // Bu yerda qo'lda tekshirish (`findUnique` → keyin `create`) yaramaydi:
      // ikki so'rov orasida boshqa admin shu nomni band qilib ulgurishi
      // mumkin. Bazadagi unique cheklov — yagona ishonchli hakam.
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
    dto: UpdateFactoryDto,
  ): Promise<FactoryAdminResponseDto> {
    await this.assertExists(id);

    // `slug` ataylab yangilanmaydi — [[update-factory.dto]] izohiga qara.
    const row = await this.prisma.factory.update({
      where: { id },
      data: dto,
      select: ADMIN_SELECT,
    });
    return this.toAdminDto(row);
  }

  /**
   * Soft delete — yozuv o'chirilmaydi, faqat `isActive: false`.
   *
   * Haqiqiy `DELETE` mumkin emas: zavodga mahsulotlar va narx qoidalari
   * bog'langan, ularni yo'qotish eski buyurtmalar tarixini buzardi.
   * Qayta faollashtirish — `PATCH { isActive: true }`.
   */
  async softDelete(id: string): Promise<FactoryAdminResponseDto> {
    await this.assertExists(id);

    const row = await this.prisma.factory.update({
      where: { id },
      data: { isActive: false },
      select: ADMIN_SELECT,
    });
    return this.toAdminDto(row);
  }

  /**
   * Yozuv bor-yo'qligini oldindan tekshiradi.
   *
   * Prisma `update` o'zi ham P2025 beradi, lekin uning matni umumiy
   * ("Yozuv topilmadi") — bu yerda qaysi resurs ekani aytiladi.
   */
  private async assertExists(id: string): Promise<void> {
    const found = await this.prisma.factory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Zavod topilmadi');
  }

  /** Prisma `_count` ni javob shakliga o'tkazadi. */
  private toAdminDto(row: AdminRow): FactoryAdminResponseDto {
    const { _count, ...rest } = row;
    return { ...rest, productCount: _count.products };
  }
}
