import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import {
  IMAGE_KINDS,
  requireFileKind,
  STORAGE_SERVICE,
  type StorageService,
  type UploadedFileData,
} from '../../storage';
import type {
  CreatePartnerDto,
  PartnerAdminDto,
  PartnerAdminQueryDto,
  PartnerPublicDto,
  UpdatePartnerDto,
} from './dto/partner.dto';

const PARTNER_NOT_FOUND = 'Hamkor topilmadi';
const LOGO_KIND_MESSAGE = 'Logotip faqat JPG, PNG yoki WEBP bo‘lishi mumkin';

const PUBLIC_SELECT = {
  id: true,
  name: true,
  logoUrl: true,
  websiteUrl: true,
} as const;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ORDER = [{ sortOrder: 'asc' }, { name: 'asc' }] as const;

/**
 * Hamkorlar (B-042, TZ 3.8 — "Hamkorlarimiz" sahifasi).
 *
 * Logotip — StorageService (B-022), tur fayl MAZMUNIDAN. Yozish — faqat
 * SUPER_ADMIN (sahifa hamma filial uchun umumiy).
 */
@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  findPublic(): Promise<PartnerPublicDto[]> {
    return this.prisma.partner.findMany({
      where: { isActive: true },
      select: PUBLIC_SELECT,
      orderBy: [...ORDER],
    });
  }

  findAdmin(query: PartnerAdminQueryDto): Promise<PartnerAdminDto[]> {
    return this.prisma.partner.findMany({
      where: query.isActive !== undefined ? { isActive: query.isActive } : {},
      select: ADMIN_SELECT,
      orderBy: [...ORDER],
    });
  }

  async create(
    file: UploadedFileData | undefined,
    dto: CreatePartnerDto,
  ): Promise<PartnerAdminDto> {
    const { buffer, kind } = requireFileKind(
      file,
      IMAGE_KINDS,
      LOGO_KIND_MESSAGE,
    );
    const { url } = await this.storage.save({
      buffer,
      folder: 'partners',
      extension: kind,
    });

    try {
      return await this.prisma.partner.create({
        data: { ...dto, name: dto.name.trim(), logoUrl: url },
        select: ADMIN_SELECT,
      });
    } catch (error) {
      await this.removeFileQuietly(url);
      throw error;
    }
  }

  async update(id: string, dto: UpdatePartnerDto): Promise<PartnerAdminDto> {
    await this.require(id);
    return this.prisma.partner.update({
      where: { id },
      data: { ...dto, ...(dto.name && { name: dto.name.trim() }) },
      select: ADMIN_SELECT,
    });
  }

  /** Logotipni almashtirish — eskisi YANGISI saqlangach o'chiriladi. */
  async replaceLogo(
    id: string,
    file: UploadedFileData | undefined,
  ): Promise<PartnerAdminDto> {
    const current = await this.require(id);
    const { buffer, kind } = requireFileKind(
      file,
      IMAGE_KINDS,
      LOGO_KIND_MESSAGE,
    );
    const { url } = await this.storage.save({
      buffer,
      folder: 'partners',
      extension: kind,
    });

    let updated: PartnerAdminDto;
    try {
      updated = await this.prisma.partner.update({
        where: { id },
        data: { logoUrl: url },
        select: ADMIN_SELECT,
      });
    } catch (error) {
      await this.removeFileQuietly(url);
      throw error;
    }
    await this.removeFileQuietly(current.logoUrl);
    return updated;
  }

  /**
   * Haqiqiy o'chirish + fayl: hamkorga hech narsa bog'lanmagan. Vaqtincha
   * yashirish — `isActive: false`.
   */
  async remove(id: string): Promise<PartnerAdminDto> {
    const partner = await this.require(id);
    await this.prisma.partner.delete({ where: { id } });
    await this.removeFileQuietly(partner.logoUrl);
    return partner;
  }

  private async require(id: string): Promise<PartnerAdminDto> {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!partner) throw new NotFoundException(PARTNER_NOT_FOUND);
    return partner;
  }

  private async removeFileQuietly(url: string): Promise<void> {
    try {
      await this.storage.delete(url);
    } catch (error) {
      this.logger.warn(
        `Faylni o‘chirib bo‘lmadi: ${url} — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
