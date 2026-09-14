import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaService } from '../../prisma';
import type {
  CreateSizeDto,
  SizeAdminResponseDto,
  SizePublicResponseDto,
  UpdateSizeDto,
} from './dto';

const PUBLIC_SELECT = {
  id: true,
  label: true,
  widthCm: true,
  heightCm: true,
} as const;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { products: true } },
} as const;

/** Tartib: admin qo'ygan raqam, teng bo'lsa yozuv (barqaror natija uchun). */
const ORDER: Prisma.ProductSizeOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { label: 'asc' },
];

type AdminRow = Prisma.ProductSizeGetPayload<{ select: typeof ADMIN_SELECT }>;

/** Ko'rinadigan yozuv — HAR DOIM o'lchamlardan hosil qilinadi. */
const buildLabel = (widthCm: number, heightCm: number): string =>
  `${widthCm}x${heightCm}`;

@Injectable()
export class SizesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ochiq ro'yxat — katalog filtri uchun (TZ 3.8).
   *
   * ⚠ `ProductSize` da `isActive` YO'Q (B-008 sxemasi), shuning uchun bu
   *   yerda [[factories.service]] dagi kabi "faqat faollar" filtri ham
   *   yo'q — hamma o'lcham ko'rinadi.
   */
  async findAllPublic(): Promise<SizePublicResponseDto[]> {
    return this.prisma.productSize.findMany({
      select: PUBLIC_SELECT,
      orderBy: ORDER,
    });
  }

  async findAllAdmin(): Promise<SizeAdminResponseDto[]> {
    const rows = await this.prisma.productSize.findMany({
      select: ADMIN_SELECT,
      orderBy: ORDER,
    });
    return rows.map((row) => this.toAdminDto(row));
  }

  async create(dto: CreateSizeDto): Promise<SizeAdminResponseDto> {
    const label = buildLabel(dto.widthCm, dto.heightCm);

    try {
      const row = await this.prisma.productSize.create({
        data: { ...dto, label },
        select: ADMIN_SELECT,
      });
      return this.toAdminDto(row);
    } catch (error) {
      this.rethrowDuplicateLabel(error, label);
    }
  }

  /**
   * O'lchamni tahrirlash.
   *
   * Eni yoki bo'yi o'zgarsa `label` qayta hisoblanadi — aks holda yozuv
   * haqiqiy o'lchamga mos kelmay qolardi ([[update-size.dto]] izohi).
   */
  async update(id: string, dto: UpdateSizeDto): Promise<SizeAdminResponseDto> {
    const current = await this.prisma.productSize.findUnique({
      where: { id },
      select: { widthCm: true, heightCm: true },
    });
    if (!current) throw new NotFoundException('O‘lcham topilmadi');

    // Yuborilmagan tomon eskisicha qoladi — `label` ikkovidan hisoblanadi,
    // shuning uchun joriy qiymatlar ham kerak.
    const widthCm = dto.widthCm ?? current.widthCm;
    const heightCm = dto.heightCm ?? current.heightCm;
    const label = buildLabel(widthCm, heightCm);

    try {
      const row = await this.prisma.productSize.update({
        where: { id },
        data: { ...dto, label },
        select: ADMIN_SELECT,
      });
      return this.toAdminDto(row);
    } catch (error) {
      this.rethrowDuplicateLabel(error, label);
    }
  }

  /**
   * O'lchamni butunlay o'chiradi (soft delete EMAS).
   *
   * ⚠ [[factories.service]] dan farqi: `ProductSize` da `isActive` ustuni
   *   yo'q, ya'ni "o'chirilgan lekin saqlangan" holat sxemada nazarda
   *   tutilmagan. Shuning uchun bu yerda haqiqiy `delete`.
   *
   * 🔒 Mahsuloti bor o'lcham o'chirilmaydi. Bazada ham `onDelete: Restrict`
   *    turibdi, lekin uning xatosi foydalanuvchiga "Bog'liq yozuv topilmadi"
   *    bo'lib chiqardi — sababi tushunarsiz. Shuning uchun oldindan
   *    sanaymiz va nechta mahsulot to'sib turganini aytamiz.
   */
  async remove(id: string): Promise<SizePublicResponseDto> {
    const found = await this.prisma.productSize.findUnique({
      where: { id },
      select: { ...PUBLIC_SELECT, _count: { select: { products: true } } },
    });
    if (!found) throw new NotFoundException('O‘lcham topilmadi');

    if (found._count.products > 0) {
      throw new ConflictException(
        `Bu o‘lchamda ${found._count.products} ta mahsulot bor — ` +
          'avval ularning o‘lchamini o‘zgartiring',
      );
    }

    await this.prisma.productSize.delete({ where: { id } });

    // O'chirilgan yozuv qaytariladi — mijoz aynan nima yo'qolganini ko'rsin.
    return {
      id: found.id,
      label: found.label,
      widthCm: found.widthCm,
      heightCm: found.heightCm,
    };
  }

  /**
   * P2002 (unique) → tushunarli 409. Boshqa xatolar o'zgarishsiz o'tadi.
   *
   * Oldindan `findUnique` bilan tekshirish yaramaydi: ikki so'rov orasida
   * boshqa admin shu o'lchamni qo'shib ulgurishi mumkin.
   */
  private rethrowDuplicateLabel(error: unknown, label: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(`"${label}" o‘lchami allaqachon mavjud`);
    }
    throw error;
  }

  private toAdminDto(row: AdminRow): SizeAdminResponseDto {
    const { _count, ...rest } = row;
    return { ...rest, productCount: _count.products };
  }
}
