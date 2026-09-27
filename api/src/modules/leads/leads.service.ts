import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'node:crypto';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { BranchType, LeadStatus } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { PrismaService } from '../../prisma';
import type { Prisma } from '../../prisma/prisma-client';
import { AppEvent, type LeadCreatedEvent } from '../notifications/events';
import type { CreateLeadDto } from './dto/create-lead.dto';
import type {
  LeadAdminDto,
  LeadAdminQueryDto,
  LeadCreatedDto,
  LeadNewCountDto,
  UpdateLeadDto,
} from './dto/lead.dto';

const LEAD_NOT_FOUND = 'Murojaat topilmadi';
const BRANCH_NOT_FOUND = 'Do‘kon topilmadi';
const PHONE_INVALID = 'Telefon raqami noto‘g‘ri';

/** Ma'lumotnoma: `VK-` + ID ning oxirgi 6 belgisi (cuid — kichik harf/raqam). */
const REFERENCE_PREFIX = 'VK-';
const REFERENCE_LENGTH = 6;

/**
 * Shu oraliqda aynan shu telefon + matn qayta kelsa — yangi yozuv
 * ochilmaydi, avvalgisining ma'lumotnomasi qaytadi (ikki marta bosish,
 * sekin tarmoqda qayta yuborish).
 */
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

const ADMIN_SELECT = {
  id: true,
  name: true,
  phone: true,
  message: true,
  status: true,
  note: true,
  branch: { select: { id: true, name: true } },
  handledBy: { select: { id: true, fullName: true } },
  handledAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.LeadSelect;

type LeadRow = Prisma.LeadGetPayload<{ select: typeof ADMIN_SELECT }>;

export function leadReference(id: string): string {
  return REFERENCE_PREFIX + id.slice(-REFERENCE_LENGTH).toUpperCase();
}

/**
 * Telefonni bitta ko'rinishga keltiradi: `+` va faqat raqamlar.
 * 9 xonali mahalliy raqam (`90 123 45 67`) → `+998901234567`.
 * Yaroqsiz bo'lsa — `null`.
 */
export function normalizeLeadPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 9) digits = `998${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return `+${digits}`;
}

/**
 * Saytdagi aloqa formasi — murojaatlar (T-013).
 *
 * Ochiq endpoint, shuning uchun spamga qarshi uch qatlam:
 *   1. IP bo'yicha rate-limit — controller'da (`ThrottlerGuard`)
 *   2. Bot tuzog'i (`website` maydoni) — to'lsa jimgina tashlanadi
 *   3. Takror — shu telefon + matn 10 daqiqa ichida qayta yozilmaydi
 *
 * 🔒 Doira (`BranchScopeService`, `CUSTOMERS` domeni — murojaat mijoz
 *    bilan ishlash): SUPER_ADMIN, MODERATOR — hammasi; BRANCH_ADMIN,
 *    MANAGER — faqat o'z filialiga yozilganlar. Do'kon tanlanmagan
 *    murojaat (`branchId = null`) filial xodimiga ko'rinmaydi.
 */
@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly events: EventEmitter2,
  ) {}

  async create(dto: CreateLeadDto): Promise<LeadCreatedDto> {
    if (dto.website) {
      // Bot — hech narsa yozilmaydi, lekin javob odamnikidan farq qilmaydi.
      this.logger.warn('Bot tuzog‘i ishladi — murojaat saqlanmadi');
      return { reference: this.fakeReference() };
    }

    const phone = normalizeLeadPhone(dto.phone);
    if (!phone) throw new BadRequestException([PHONE_INVALID]);

    if (dto.branchId) await this.requirePublicBranch(dto.branchId);

    const duplicate = await this.prisma.lead.findFirst({
      where: {
        phone,
        message: dto.message,
        createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    if (duplicate) return { reference: leadReference(duplicate.id) };

    const lead = await this.prisma.lead.create({
      data: {
        name: dto.name,
        phone,
        message: dto.message,
        branchId: dto.branchId ?? null,
      },
      select: { id: true },
    });

    this.events.emit(AppEvent.LeadCreated, {
      leadId: lead.id,
    } satisfies LeadCreatedEvent);

    return { reference: leadReference(lead.id) };
  }

  async findAdmin(
    actor: Actor,
    query: LeadAdminQueryDto,
  ): Promise<PaginatedResult<LeadAdminDto>> {
    const scope = this.branchScope.resolve(actor, query.branchId, 'CUSTOMERS');
    const where: Prisma.LeadWhereInput = {
      ...this.branchScope.toPrismaFilter(scope),
      ...(query.status && { status: query.status }),
      ...(query.search && { OR: this.searchFilter(query.search) }),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        select: ADMIN_SELECT,
        orderBy: [{ createdAt: query.sortOrder }, { id: query.sortOrder }],
        skip: query.skip,
        take: query.take,
      }),
    ]);

    return paginate(rows.map(toAdminDto), total, query);
  }

  /** Menyudagi nishon uchun — doiradagi yangi murojaatlar soni. */
  async countNew(actor: Actor): Promise<LeadNewCountDto> {
    const scope = this.branchScope.resolve(actor, undefined, 'CUSTOMERS');
    const count = await this.prisma.lead.count({
      where: {
        ...this.branchScope.toPrismaFilter(scope),
        status: LeadStatus.NEW,
      },
    });
    return { count };
  }

  async findOne(actor: Actor, id: string): Promise<LeadAdminDto> {
    return toAdminDto(await this.requireInScope(actor, id));
  }

  /**
   * Holat va/yoki izoh. Holat o'zgarsa — kim va qachon yoziladi
   * (`handledBy`, `handledAt`); faqat izoh o'zgarsa — yo'q.
   */
  async update(
    actor: Actor,
    id: string,
    dto: UpdateLeadDto,
  ): Promise<LeadAdminDto> {
    const current = await this.requireInScope(actor, id);
    const statusChanged =
      dto.status !== undefined && dto.status !== current.status;

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
        ...(statusChanged && {
          status: dto.status,
          handledByUserId: actor.id,
          handledAt: new Date(),
        }),
      },
      select: ADMIN_SELECT,
    });
    return toAdminDto(updated);
  }

  /**
   * 🔒 Begona filial murojaati ham, umuman yo'q murojaat ham — BIR XIL 404.
   *    Do'konsiz murojaat faqat cheklovsiz subyektga (`ALL`) ko'rinadi.
   */
  private async requireInScope(actor: Actor, id: string): Promise<LeadRow> {
    const scope = this.branchScope.resolve(actor, undefined, 'CUSTOMERS');
    const lead = await this.prisma.lead.findFirst({
      where: { id, ...this.branchScope.toPrismaFilter(scope) },
      select: ADMIN_SELECT,
    });
    if (!lead) throw new NotFoundException(LEAD_NOT_FOUND);
    return lead;
  }

  /** Mehmon faqat saytda ko'rinadigan do'konni tanlay oladi (faol RETAIL). */
  private async requirePublicBranch(branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, isActive: true, type: BranchType.RETAIL },
      select: { id: true },
    });
    if (!branch) throw new BadRequestException([BRANCH_NOT_FOUND]);
  }

  private searchFilter(search: string): Prisma.LeadWhereInput[] {
    const filters: Prisma.LeadWhereInput[] = [
      { name: { contains: search, mode: 'insensitive' } },
    ];

    const digits = search.replace(/\D/g, '');
    if (digits.length >= 3) filters.push({ phone: { contains: digits } });

    const upper = search.toUpperCase();
    if (upper.startsWith(REFERENCE_PREFIX)) {
      const suffix = upper.slice(REFERENCE_PREFIX.length).toLowerCase();
      if (suffix.length === REFERENCE_LENGTH) {
        filters.push({ id: { endsWith: suffix } });
      }
    }
    return filters;
  }

  /** Bot uchun ma'lumotnoma — haqiqiysidan ajratib bo'lmaydigan ko'rinishda. */
  private fakeReference(): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = randomBytes(REFERENCE_LENGTH);
    const id = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
    return leadReference(id);
  }
}

function toAdminDto(row: LeadRow): LeadAdminDto {
  return { ...row, reference: leadReference(row.id) };
}
