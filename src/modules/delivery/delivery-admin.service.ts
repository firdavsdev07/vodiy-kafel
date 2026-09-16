import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import type {
  CreateRegionDto,
  CreateTransportTypeDto,
  ReferenceQueryDto,
  RegionAdminDto,
  TariffAdminDto,
  TariffQueryDto,
  TransportTypeAdminDto,
  UpdateRegionDto,
  UpdateTariffPriceDto,
  UpdateTransportTypeDto,
  UpsertTariffDto,
} from './dto';

const REFERENCE_ORDER = [{ sortOrder: 'asc' }, { name: 'asc' }] as const;

const TRANSPORT_SELECT = {
  id: true,
  name: true,
  capacityPallets: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const REGION_SELECT = {
  id: true,
  name: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const TARIFF_SELECT = {
  id: true,
  price: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true } },
  region: { select: { id: true, name: true } },
  transportType: { select: { id: true, name: true, capacityPallets: true } },
} as const;

type TariffRow = Prisma.BranchRegionTariffGetPayload<{
  select: typeof TARIFF_SELECT;
}>;

const TARIFF_NOT_FOUND = 'Tarif topilmadi';

/**
 * Yetkazib berish — admin (B-056, TZ 3.13, 3.14).
 *
 * Transport turlari va viloyatlar — hammaga umumiy, faqat SUPER_ADMIN.
 * O'chirish = `isActive: false` (buyurtmalar ularga `Restrict` bilan
 * bog'langan). Nofaol tur/viloyat kalkulyatorda ishlamaydi (B-027).
 *
 * Tarif — filialga xos. 🔒 BranchScopeService (B-051): filial admini faqat
 * o'z filiali tarifini ko'radi va o'zgartiradi, boshqasi — 404.
 */
@Injectable()
export class DeliveryAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
  ) {}

  // — Transport turlari —

  findTransportTypes(
    query: ReferenceQueryDto,
  ): Promise<TransportTypeAdminDto[]> {
    return this.prisma.transportType.findMany({
      where: query.isActive !== undefined ? { isActive: query.isActive } : {},
      select: TRANSPORT_SELECT,
      orderBy: [...REFERENCE_ORDER],
    });
  }

  createTransportType(
    dto: CreateTransportTypeDto,
  ): Promise<TransportTypeAdminDto> {
    return this.unique(
      this.prisma.transportType.create({
        data: { ...dto, name: dto.name.trim() },
        select: TRANSPORT_SELECT,
      }),
    );
  }

  async updateTransportType(
    id: string,
    dto: UpdateTransportTypeDto,
  ): Promise<TransportTypeAdminDto> {
    await this.requireTransportType(id);
    return this.unique(
      this.prisma.transportType.update({
        where: { id },
        data: { ...dto, ...(dto.name && { name: dto.name.trim() }) },
        select: TRANSPORT_SELECT,
      }),
    );
  }

  async deactivateTransportType(id: string): Promise<TransportTypeAdminDto> {
    await this.requireTransportType(id);
    return this.prisma.transportType.update({
      where: { id },
      data: { isActive: false },
      select: TRANSPORT_SELECT,
    });
  }

  // — Viloyatlar —

  findRegions(query: ReferenceQueryDto): Promise<RegionAdminDto[]> {
    return this.prisma.region.findMany({
      where: query.isActive !== undefined ? { isActive: query.isActive } : {},
      select: REGION_SELECT,
      orderBy: [...REFERENCE_ORDER],
    });
  }

  createRegion(dto: CreateRegionDto): Promise<RegionAdminDto> {
    return this.unique(
      this.prisma.region.create({
        data: { ...dto, name: dto.name.trim() },
        select: REGION_SELECT,
      }),
    );
  }

  async updateRegion(
    id: string,
    dto: UpdateRegionDto,
  ): Promise<RegionAdminDto> {
    await this.requireRegion(id);
    return this.unique(
      this.prisma.region.update({
        where: { id },
        data: { ...dto, ...(dto.name && { name: dto.name.trim() }) },
        select: REGION_SELECT,
      }),
    );
  }

  async deactivateRegion(id: string): Promise<RegionAdminDto> {
    await this.requireRegion(id);
    return this.prisma.region.update({
      where: { id },
      data: { isActive: false },
      select: REGION_SELECT,
    });
  }

  // — Tariflar —

  async findTariffs(
    actor: Actor | undefined,
    query: TariffQueryDto,
  ): Promise<PaginatedResult<TariffAdminDto>> {
    const scope = this.branchScope.resolve(actor, query.branchId);
    const where: Prisma.BranchRegionTariffWhereInput = {
      ...this.branchScope.toPrismaFilter(scope),
      ...(query.regionId && { regionId: query.regionId }),
      ...(query.transportTypeId && { transportTypeId: query.transportTypeId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.branchRegionTariff.count({ where }),
      this.prisma.branchRegionTariff.findMany({
        where,
        select: TARIFF_SELECT,
        orderBy: [
          { branch: { sortOrder: 'asc' } },
          { region: { sortOrder: 'asc' } },
          { transportType: { sortOrder: 'asc' } },
          { id: 'asc' },
        ],
        skip: query.skip,
        take: query.take,
      }),
    ]);
    return paginate(rows.map(toTariffDto), total, query);
  }

  /** (filial, viloyat, transport) bo'yicha bor bo'lsa yangilaydi, yo'q bo'lsa yaratadi. */
  async upsertTariff(
    actor: Actor | undefined,
    dto: UpsertTariffDto,
  ): Promise<TariffAdminDto> {
    const branchId = this.branchScope.requireBranchId(actor, dto.branchId);
    const [branch, region, transportType] = await Promise.all([
      this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true },
      }),
      this.prisma.region.findUnique({
        where: { id: dto.regionId },
        select: { id: true },
      }),
      this.prisma.transportType.findUnique({
        where: { id: dto.transportTypeId },
        select: { id: true },
      }),
    ]);
    if (!branch) throw new NotFoundException('Filial topilmadi');
    if (!region) throw new BadRequestException('Viloyat topilmadi');
    if (!transportType) {
      throw new BadRequestException('Transport turi topilmadi');
    }

    const row = await this.prisma.branchRegionTariff.upsert({
      where: {
        branchId_regionId_transportTypeId: {
          branchId,
          regionId: dto.regionId,
          transportTypeId: dto.transportTypeId,
        },
      },
      create: {
        branchId,
        regionId: dto.regionId,
        transportTypeId: dto.transportTypeId,
        price: dto.price,
        isActive: dto.isActive ?? true,
      },
      update: {
        price: dto.price,
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: TARIFF_SELECT,
    });
    return toTariffDto(row);
  }

  async updateTariffPrice(
    actor: Actor | undefined,
    id: string,
    dto: UpdateTariffPriceDto,
  ): Promise<TariffAdminDto> {
    const existing = await this.prisma.branchRegionTariff.findUnique({
      where: { id },
      select: { branchId: true },
    });
    if (!existing) throw new NotFoundException(TARIFF_NOT_FOUND);
    this.branchScope.assertWithinScope(
      actor,
      existing.branchId,
      TARIFF_NOT_FOUND,
    );

    const row = await this.prisma.branchRegionTariff.update({
      where: { id },
      data: { price: dto.price },
      select: TARIFF_SELECT,
    });
    return toTariffDto(row);
  }

  // — Ichki —

  private async requireTransportType(id: string): Promise<void> {
    const found = await this.prisma.transportType.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Transport turi topilmadi');
  }

  private async requireRegion(id: string): Promise<void> {
    const found = await this.prisma.region.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Viloyat topilmadi');
  }

  private async unique<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Bu nom band');
      }
      throw error;
    }
  }
}

function toTariffDto(row: TariffRow): TariffAdminDto {
  return { ...row, price: row.price.toString() };
}
