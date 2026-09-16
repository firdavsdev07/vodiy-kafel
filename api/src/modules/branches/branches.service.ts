import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { BranchType, UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { PrismaService } from '../../prisma';
import {
  IMAGE_KINDS,
  requireFileKind,
  STORAGE_SERVICE,
  type StorageService,
  type UploadedFileData,
} from '../../storage';
import type {
  BranchAdminDto,
  BranchAdminQueryDto,
  BranchPublicDto,
  CreateBranchDto,
  UpdateBranchDto,
} from './dto/branch.dto';

const BRANCH_NOT_FOUND = 'Filial topilmadi';

const PUBLIC_SELECT = {
  id: true,
  name: true,
  city: true,
  address: true,
  latitude: true,
  longitude: true,
  workingHours: true,
  phones: true,
  buildingImageUrl: true,
  telegramUrl: true,
  instagramUrl: true,
} as const;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  type: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Filial admini o'z filialida tahrirlay oladigan maydonlar — faqat KONTAKT
 * (TZ 3.7, B-041). Nom, shahar, tartib, holat — bosh admin ishi.
 */
const CONTACT_FIELDS: ReadonlySet<string> = new Set([
  'address',
  'latitude',
  'longitude',
  'workingHours',
  'phones',
  'telegramUrl',
  'instagramUrl',
]);

/**
 * Filiallar (B-041, TZ 3.7).
 *
 * 🔒 Ochiq ro'yxatda FAQAT faol RETAIL filial; `type` javobga chiqmaydi —
 *    markaziy ombor do'kon emas, mijoz uni ko'rmasligi kerak (TZ 3.7.2).
 * 🔒 Yaratish/o'chirish — SUPER_ADMIN. Filial admini faqat O'Z filialining
 *    kontaktini va bino suratini tahrirlaydi; boshqa filial — 404.
 */
@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  // — Ochiq —

  findAllPublic(): Promise<BranchPublicDto[]> {
    return this.prisma.branch.findMany({
      where: { isActive: true, type: BranchType.RETAIL },
      select: PUBLIC_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOnePublic(id: string): Promise<BranchPublicDto> {
    const branch = await this.prisma.branch.findFirst({
      where: { id, isActive: true, type: BranchType.RETAIL },
      select: PUBLIC_SELECT,
    });
    if (!branch) throw new NotFoundException(BRANCH_NOT_FOUND);
    return branch;
  }

  // — Admin —

  findAllAdmin(
    actor: Actor | undefined,
    query: BranchAdminQueryDto,
  ): Promise<BranchAdminDto[]> {
    // Filial "resursining" o'zi — filtr `id` bo'yicha (branchId emas).
    const scope = this.branchScope.resolve(actor);
    return this.prisma.branch.findMany({
      where: {
        ...(scope.kind === 'SINGLE' && { id: scope.branchId }),
        ...(query.type && { type: query.type }),
        ...(query.isActive !== undefined && { isActive: query.isActive }),
      },
      select: ADMIN_SELECT,
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOneAdmin(
    actor: Actor | undefined,
    id: string,
  ): Promise<BranchAdminDto> {
    this.branchScope.assertWithinScope(actor, id, BRANCH_NOT_FOUND);
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!branch) throw new NotFoundException(BRANCH_NOT_FOUND);
    return branch;
  }

  create(dto: CreateBranchDto): Promise<BranchAdminDto> {
    return this.prisma.branch.create({ data: dto, select: ADMIN_SELECT });
  }

  async update(
    actor: Actor | undefined,
    id: string,
    dto: UpdateBranchDto,
  ): Promise<BranchAdminDto> {
    await this.findOneAdmin(actor, id);

    if (actor?.role !== UserRole.SUPER_ADMIN) {
      const forbidden = Object.keys(dto).filter(
        (key) =>
          dto[key as keyof UpdateBranchDto] !== undefined &&
          !CONTACT_FIELDS.has(key),
      );
      if (forbidden.length > 0) {
        throw new ForbiddenException(
          `Filial admini faqat kontaktni tahrirlaydi; ruxsat yo‘q: ${forbidden.join(', ')}`,
        );
      }
    }

    return this.prisma.branch.update({
      where: { id },
      data: dto,
      select: ADMIN_SELECT,
    });
  }

  /**
   * Soft delete. Haqiqiy o'chirish yo'q: filialga buyurtma, mijoz, xodim,
   * narx bog'langan. Yopiq filial mijozlari buyurtma bera olmaydi (B-027).
   */
  async deactivate(id: string): Promise<BranchAdminDto> {
    await this.assertExists(id);
    return this.prisma.branch.update({
      where: { id },
      data: { isActive: false },
      select: ADMIN_SELECT,
    });
  }

  /** Bino surati — eskisi yangisi saqlangandan KEYIN o'chiriladi. */
  async uploadImage(
    actor: Actor | undefined,
    id: string,
    file: UploadedFileData | undefined,
  ): Promise<BranchAdminDto> {
    const current = await this.findOneAdmin(actor, id);
    const { buffer, kind } = requireFileKind(
      file,
      IMAGE_KINDS,
      'Rasm faqat JPG, PNG yoki WEBP bo‘lishi mumkin',
    );

    const { url } = await this.storage.save({
      buffer,
      folder: 'branches',
      extension: kind,
    });

    let updated: BranchAdminDto;
    try {
      updated = await this.prisma.branch.update({
        where: { id },
        data: { buildingImageUrl: url },
        select: ADMIN_SELECT,
      });
    } catch (error) {
      await this.removeFileQuietly(url);
      throw error;
    }

    if (current.buildingImageUrl) {
      await this.removeFileQuietly(current.buildingImageUrl);
    }
    return updated;
  }

  private async assertExists(id: string): Promise<void> {
    const found = await this.prisma.branch.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(BRANCH_NOT_FOUND);
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
}
