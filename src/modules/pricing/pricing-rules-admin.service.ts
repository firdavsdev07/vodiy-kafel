import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  PricingDomain,
  PricingScope,
  PricingValueType,
  UserRole,
} from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { toMoney } from '../../common/utils';
import { Prisma, PrismaService } from '../../prisma';
import { SettingsService } from '../settings/settings.service';
import type { CreatePricingRuleDto, PricingRuleAdminDto } from './dto';

const CUSTOMER_NOT_FOUND = 'Mijoz topilmadi';
const RULE_NOT_FOUND = 'Qoida topilmadi';

/** Domen → ruxsat etilgan aniqlik darajalari (baza CHECK bilan bir xil). */
const SCOPES_BY_DOMAIN: Record<PricingDomain, readonly PricingScope[]> = {
  [PricingDomain.PRODUCT]: [
    PricingScope.PRODUCT,
    PricingScope.FACTORY,
    PricingScope.ALL,
  ],
  [PricingDomain.TRANSPORT]: [PricingScope.ROUTE, PricingScope.ALL],
};

const RULE_SELECT = {
  id: true,
  domain: true,
  scope: true,
  type: true,
  value: true,
  createdByRole: true,
  createdAt: true,
  createdBy: { select: { id: true, fullName: true } },
  product: { select: { id: true, name: true } },
  factory: { select: { id: true, name: true } },
  branchRegionTariff: {
    select: {
      id: true,
      region: { select: { name: true } },
      transportType: { select: { name: true } },
    },
  },
} as const;

type RuleRow = Prisma.PricingRuleGetPayload<{ select: typeof RULE_SELECT }>;

/** Tekshirilgan, bazaga yozishga tayyor qoida (mijoz ID sisiz). */
export type PreparedPricingRule = Omit<
  Prisma.PricingRuleUncheckedCreateInput,
  'customerId'
>;

/**
 * Mijozga individual narx qoidalari — admin (B-055, TZ 3.3.1, 3.14).
 *
 * 🔒 Ruxsatlar:
 *   SUPER_ADMIN  — istalgan domen/scope/tur, hammasini ko'radi.
 *   BRANCH_ADMIN — faqat o'z filiali mijoziga; faqat PERCENT CHEGIRMA va
 *                  `pricing.branchAdminMaxDiscountPercent` chegarasigacha
 *                  (mahsulot ham, transport ham — TZ 7, savol 11 ochiq,
 *                  hozircha bitta chegara). Faqat O'ZI yaratganlarini
 *                  ko'radi va o'chiradi — SUPER_ADMIN qoidalari sir.
 *   Boshqa rollar — 403.
 *
 * Bir mijozga bir darajada bitta qoida (partial unique) — takror 409.
 * Qoida o'zgartirilmaydi: o'chirib, yangisini qo'yish (tarix aniq bo'lsin).
 */
@Injectable()
export class PricingRulesAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly settings: SettingsService,
  ) {}

  async list(
    actor: Actor | undefined,
    customerId: string,
  ): Promise<PricingRuleAdminDto[]> {
    const role = this.requireRole(actor);
    await this.requireCustomerBranch(actor, customerId);

    const rows = await this.prisma.pricingRule.findMany({
      where: {
        customerId,
        ...(role === UserRole.BRANCH_ADMIN && {
          createdByUserId: actor!.id,
        }),
      },
      select: RULE_SELECT,
      orderBy: [{ domain: 'asc' }, { scope: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toDto);
  }

  async create(
    actor: Actor | undefined,
    customerId: string,
    dto: CreatePricingRuleDto,
  ): Promise<PricingRuleAdminDto> {
    this.requireRole(actor);
    const branchId = await this.requireCustomerBranch(actor, customerId);
    const [prepared] = await this.prepare(actor, branchId, [dto]);

    try {
      const row = await this.prisma.pricingRule.create({
        data: { ...prepared, customerId },
        select: RULE_SELECT,
      });
      return toDto(row);
    } catch (error) {
      throw mapUniqueError(error);
    }
  }

  async remove(
    actor: Actor | undefined,
    customerId: string,
    ruleId: string,
  ): Promise<PricingRuleAdminDto> {
    const role = this.requireRole(actor);
    await this.requireCustomerBranch(actor, customerId);

    // 🔒 Filial admini uchun begona (SUPER_ADMIN) qoida — "topilmadi":
    //    uning mavjudligi ham sir.
    const rule = await this.prisma.pricingRule.findFirst({
      where: {
        id: ruleId,
        customerId,
        ...(role === UserRole.BRANCH_ADMIN && {
          createdByUserId: actor!.id,
        }),
      },
      select: RULE_SELECT,
    });
    if (!rule) throw new NotFoundException(RULE_NOT_FOUND);

    await this.prisma.pricingRule.deleteMany({ where: { id: rule.id } });
    return toDto(rule);
  }

  /**
   * Qoidalarni tekshiradi va yozishga tayyorlaydi — bazaga YOZMAYDI.
   * Mijoz yaratish bilan birga qoida berilganda (B-036) ham shu ishlatiladi:
   * ruxsat qoidalari ikki joyda yozilmaydi.
   *
   * @param branchId Mijozning filiali (tarif shu filialniki bo'lishi shart).
   */
  async prepare(
    actor: Actor | undefined,
    branchId: string,
    dtos: CreatePricingRuleDto[],
  ): Promise<PreparedPricingRule[]> {
    const role = this.requireRole(actor);
    const maxDiscount =
      role === UserRole.BRANCH_ADMIN
        ? await this.settings.get('pricing.branchAdminMaxDiscountPercent')
        : null;

    const seen = new Set<string>();
    const prepared: PreparedPricingRule[] = [];
    for (const dto of dtos) {
      this.assertShape(dto);
      const levelKey = `${dto.domain}:${dto.scope}:${dto.scopeId ?? ''}`;
      if (seen.has(levelKey)) {
        throw new BadRequestException(
          'Bir darajada ikkita qoida berildi — bittasini qoldiring',
        );
      }
      seen.add(levelKey);

      if (maxDiscount !== null) this.assertBranchAdminLimit(dto, maxDiscount);
      await this.assertTarget(dto, branchId);

      prepared.push({
        domain: dto.domain,
        scope: dto.scope,
        productId: dto.scope === PricingScope.PRODUCT ? dto.scopeId : null,
        factoryId: dto.scope === PricingScope.FACTORY ? dto.scopeId : null,
        branchRegionTariffId:
          dto.scope === PricingScope.ROUTE ? dto.scopeId : null,
        type: dto.type,
        value: toMoney(dto.value),
        createdByUserId: actor!.id,
        createdByRole: role,
      });
    }
    return prepared;
  }

  // — Ichki —

  private requireRole(
    actor: Actor | undefined,
  ): typeof UserRole.SUPER_ADMIN | typeof UserRole.BRANCH_ADMIN {
    if (
      actor?.type === 'USER' &&
      (actor.role === UserRole.SUPER_ADMIN ||
        actor.role === UserRole.BRANCH_ADMIN)
    ) {
      return actor.role;
    }
    throw new ForbiddenException(
      'Individual narxni faqat bosh admin yoki filial admini belgilaydi',
    );
  }

  private async requireCustomerBranch(
    actor: Actor | undefined,
    customerId: string,
  ): Promise<string> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { branchId: true },
    });
    if (!customer) throw new NotFoundException(CUSTOMER_NOT_FOUND);
    this.branchScope.assertWithinScope(
      actor,
      customer.branchId,
      CUSTOMER_NOT_FOUND,
    );
    return customer.branchId;
  }

  private assertShape(dto: CreatePricingRuleDto): void {
    if (!SCOPES_BY_DOMAIN[dto.domain].includes(dto.scope)) {
      throw new BadRequestException(
        `${dto.domain} domenida scope: ${SCOPES_BY_DOMAIN[dto.domain].join(', ')}`,
      );
    }
    if ((dto.scope === PricingScope.ALL) !== (dto.scopeId === undefined)) {
      throw new BadRequestException(
        dto.scope === PricingScope.ALL
          ? 'scope=ALL da scopeId berilmaydi'
          : `scope=${dto.scope} uchun scopeId majburiy`,
      );
    }

    const value = toMoney(dto.value);
    if (dto.type === PricingValueType.FIXED && !value.isPositive()) {
      throw new BadRequestException('FIXED narx musbat bo‘lishi kerak');
    }
    if (dto.type === PricingValueType.PERCENT && value.lte(-100)) {
      throw new BadRequestException('Foiz −100 dan katta bo‘lishi kerak');
    }
  }

  private assertBranchAdminLimit(
    dto: CreatePricingRuleDto,
    maxDiscount: number,
  ): void {
    if (dto.type !== PricingValueType.PERCENT) {
      throw new BadRequestException(
        'Filial admini faqat foizli (PERCENT) chegirma beradi',
      );
    }
    const value = toMoney(dto.value);
    if (!value.isNegative()) {
      throw new BadRequestException(
        'Filial admini faqat chegirma beradi (manfiy foiz)',
      );
    }
    if (value.neg().gt(maxDiscount)) {
      throw new BadRequestException(
        maxDiscount === 0
          ? 'Filial adminiga chegirma berish ruxsati sozlanmagan'
          : `Chegirma ${maxDiscount}% dan oshmasligi kerak`,
      );
    }
  }

  /** Nishon mavjud; yo'nalish esa AYNAN mijoz filialining tarifi. */
  private async assertTarget(
    dto: CreatePricingRuleDto,
    branchId: string,
  ): Promise<void> {
    const id = dto.scopeId;
    let exists = true;
    switch (dto.scope) {
      case PricingScope.PRODUCT:
        exists = Boolean(
          await this.prisma.product.findUnique({
            where: { id },
            select: { id: true },
          }),
        );
        break;
      case PricingScope.FACTORY:
        exists = Boolean(
          await this.prisma.factory.findUnique({
            where: { id },
            select: { id: true },
          }),
        );
        break;
      case PricingScope.ROUTE: {
        const tariff = await this.prisma.branchRegionTariff.findUnique({
          where: { id },
          select: { branchId: true },
        });
        // Boshqa filial tarifiga qoida — mijozga hech qachon ishlamaydi
        // (u o'z filiali tarifidan hisoblanadi) va begona tarif ID sini
        // sinab ko'rishga imkon beradi. Ikkalasi bir xil xato.
        exists = tariff?.branchId === branchId;
        break;
      }
      case PricingScope.ALL:
        return;
    }
    if (!exists) {
      throw new BadRequestException(
        `scopeId topilmadi${dto.scope === PricingScope.ROUTE ? ' yoki mijoz filialining tarifi emas' : ''}`,
      );
    }
  }
}

export function mapUniqueError(error: unknown): unknown {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return new ConflictException(
      'Bu mijoz uchun shu darajada qoida allaqachon bor — avval uni o‘chiring',
    );
  }
  return error;
}

function toDto(row: RuleRow): PricingRuleAdminDto {
  const target = row.product
    ? row.product
    : row.factory
      ? row.factory
      : row.branchRegionTariff
        ? {
            id: row.branchRegionTariff.id,
            name: `${row.branchRegionTariff.region.name} · ${row.branchRegionTariff.transportType.name}`,
          }
        : null;
  return {
    id: row.id,
    domain: row.domain,
    scope: row.scope,
    target,
    type: row.type,
    value: row.value.toString(),
    createdBy: row.createdBy,
    createdByRole: row.createdByRole,
    createdAt: row.createdAt,
  };
}
