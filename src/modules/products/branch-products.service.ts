import { Injectable, NotFoundException } from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import type {
  BranchProductAdminResponseDto,
  BranchProductQueryDto,
  UpdateBranchProductPriceDto,
  UpsertBranchProductDto,
} from './dto';

const SELECT = {
  id: true,
  pricePerSqm: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true, city: true } },
  product: { select: { id: true, name: true, slug: true, isActive: true } },
} as const;

type Row = Prisma.BranchProductGetPayload<{ select: typeof SELECT }>;

/** Mavjud emas va begona filialniki — BIR XIL javob (B-051). */
const BRANCH_PRODUCT_NOT_FOUND = 'Filial narxi topilmadi';

/**
 * Filial narxlari — `BranchProduct` (B-021).
 *
 * 🔒 Har bir o'qish va yozish `BranchScopeService` orqali (B-051). Filial
 *    body/query'dan faqat SUPER_ADMIN uchun olinadi; cheklangan rol har
 *    doim o'z filialiga majburlanadi.
 */
@Injectable()
export class BranchProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
  ) {}

  async findAll(
    actor: Actor | undefined,
    query: BranchProductQueryDto,
  ): Promise<PaginatedResult<BranchProductAdminResponseDto>> {
    const scope = this.branchScope.resolve(actor, query.branchId);

    const where: Prisma.BranchProductWhereInput = {
      ...this.branchScope.toPrismaFilter(scope),
      ...(query.productId && { productId: query.productId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };

    const [total, rows] = await Promise.all([
      this.prisma.branchProduct.count({ where }),
      this.prisma.branchProduct.findMany({
        where,
        select: SELECT,
        orderBy: [
          { product: { name: 'asc' } },
          { branch: { sortOrder: 'asc' } },
          { id: 'asc' },
        ],
        skip: query.skip,
        take: query.take,
      }),
    ]);

    return paginate(
      rows.map((row) => this.toDto(row)),
      total,
      query,
    );
  }

  /**
   * Narxni o'rnatadi — (filial, mahsulot) juftligi bo'yicha bor bo'lsa
   * yangilaydi, yo'q bo'lsa yaratadi.
   */
  async upsert(
    actor: Actor | undefined,
    dto: UpsertBranchProductDto,
  ): Promise<BranchProductAdminResponseDto> {
    const branchId = this.branchScope.requireBranchId(actor, dto.branchId);

    const [branch, product] = await Promise.all([
      this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true },
      }),
      this.prisma.product.findUnique({
        where: { id: dto.productId },
        select: { id: true },
      }),
    ]);
    if (!branch) throw new NotFoundException('Filial topilmadi');
    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    const row = await this.prisma.branchProduct.upsert({
      where: { branchId_productId: { branchId, productId: product.id } },
      create: {
        branchId,
        productId: product.id,
        pricePerSqm: dto.pricePerSqm,
        isActive: dto.isActive ?? true,
      },
      update: {
        pricePerSqm: dto.pricePerSqm,
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: SELECT,
    });
    return this.toDto(row);
  }

  async updatePrice(
    actor: Actor | undefined,
    id: string,
    dto: UpdateBranchProductPriceDto,
  ): Promise<BranchProductAdminResponseDto> {
    const existing = await this.prisma.branchProduct.findUnique({
      where: { id },
      select: { branchId: true },
    });
    if (!existing) throw new NotFoundException(BRANCH_PRODUCT_NOT_FOUND);
    this.branchScope.assertWithinScope(
      actor,
      existing.branchId,
      BRANCH_PRODUCT_NOT_FOUND,
    );

    const row = await this.prisma.branchProduct.update({
      where: { id },
      data: { pricePerSqm: dto.pricePerSqm },
      select: SELECT,
    });
    return this.toDto(row);
  }

  private toDto(row: Row): BranchProductAdminResponseDto {
    return { ...row, pricePerSqm: row.pricePerSqm.toString() };
  }
}
