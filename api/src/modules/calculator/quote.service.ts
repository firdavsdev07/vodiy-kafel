import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { BranchType } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { PrismaService } from '../../prisma';
import {
  DeliveryService,
  type ActiveTariff,
} from '../delivery/delivery.service';
import { PricingRulesService } from '../pricing/pricing-rules.service';
import {
  CalculatorService,
  type CalculatedTransport,
  type CalculationResult,
} from './calculator.service';
import type {
  DeliveryRequestDto,
  DeliveryResponseDto,
  QuoteItemDto,
  QuoteResponseDto,
} from './dto';

export interface QuoteCustomer {
  customerId: string;
  branchId: string;
  /** Mijozga biriktirilgan menejer — buyurtmaga o'tadi. */
  managerId: string | null;
  /** Markaziy omborga biriktirilgan B2B agent (TZ 3.7.2). */
  isAgent: boolean;
}

/**
 * Narx konteksti: filial + (ixtiyoriy) mijoz. Mijoz bo'lmasa — hisobi yo'q
 * xaridor (menejer telefon orqali kiritgan): filialning BAZAVIY narxi,
 * individual qoidalarsiz.
 */
export interface QuotePricingContext {
  branchId: string;
  customerId: string | null;
}

export interface QuoteRoute {
  regionId?: string;
  transportTypeId?: string;
}

/** Hisob + uni tuzishda ishlatilgan ma'lumotlar (B-028 buyurtma uchun). */
export interface BuiltQuote {
  result: CalculationResult;
  productNames: Map<string, string>;
  tariff: ActiveTariff | null;
}

/**
 * Kalkulyatorni bazadagi ma'lumot bilan to'ldiradi (B-027).
 *
 * `CalculatorService` sof — bu servis unga kerakli narsalarni yig'adi:
 * filial narxlari, tarif, mijoz qoidalari. Buyurtma (B-028) ham AYNAN
 * shu yo'ldan o'tadi — kalkulyatorda ko'rilgan summa bilan buyurtma summasi
 * bir xil manbadan.
 */
@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly calculator: CalculatorService,
    private readonly delivery: DeliveryService,
    private readonly pricingRules: PricingRulesService,
  ) {}

  async quote(
    actor: Actor | undefined,
    items: QuoteItemDto[],
    route: QuoteRoute,
  ): Promise<QuoteResponseDto> {
    const customer = await this.requireCustomer(actor);
    const { result, productNames, tariff } = await this.build(
      customer,
      items,
      route,
    );
    const enough = await this.stockSufficiency(result.items);

    return {
      stockShortage: result.items.some((item) => !enough(item.productId)),
      items: result.items.map((item) => ({
        enoughStock: enough(item.productId),
        productId: item.productId,
        name: productNames.get(item.productId) ?? '',
        pallets: item.pallets,
        sqm: item.sqm.toString(),
        weightKg: item.weightKg.toString(),
        pricePerSqm: item.pricePerSqm.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
      totalPallets: result.totalPallets,
      totalSqm: result.totalSqm.toString(),
      totalWeightKg: result.totalWeightKg.toString(),
      itemsTotal: result.itemsTotal.toString(),
      transport:
        result.transport && tariff
          ? this.toDeliveryDto(result.transport, tariff)
          : null,
      deliveryTotal: result.deliveryTotal.toString(),
      grandTotal: result.grandTotal.toString(),
    };
  }

  async deliveryOnly(
    actor: Actor | undefined,
    dto: DeliveryRequestDto,
  ): Promise<DeliveryResponseDto> {
    const customer = await this.requireCustomer(actor);

    await this.assertBranchActive(customer.branchId);
    const [tariff, rules] = await Promise.all([
      this.delivery.requireActiveTariff(
        customer.branchId,
        dto.regionId,
        dto.transportTypeId,
      ),
      this.pricingRules.findForCustomer(customer.customerId),
    ]);

    const transport = this.calculator.calculateDelivery(
      this.toTransportInput(tariff),
      dto.totalPallets,
      rules.transport,
    );
    return this.toDeliveryDto(transport, tariff);
  }

  /**
   * Zaxira yetadimi — mahsulot bo'yicha JAMI paddon (bir mahsulot ikki
   * qatorda kelishi mumkin). Buyurtma (`OrdersService.place`) aynan shu
   * shart bilan zaxirani band qiladi (T-005).
   *
   * 🔒 Faqat `boolean` qaytadi — aniq son sir (CLAUDE.md qoida 2).
   */
  private async stockSufficiency(
    items: readonly { productId: string; pallets: number }[],
  ): Promise<(productId: string) => boolean> {
    const wanted = new Map<string, number>();
    for (const item of items) {
      wanted.set(
        item.productId,
        (wanted.get(item.productId) ?? 0) + item.pallets,
      );
    }
    const stocks = await this.prisma.productStock.findMany({
      where: { productId: { in: [...wanted.keys()] } },
      select: { productId: true, stockPallets: true },
    });
    const available = new Map(stocks.map((s) => [s.productId, s.stockPallets]));
    return (productId) =>
      (available.get(productId) ?? 0) >= (wanted.get(productId) ?? 0);
  }

  /**
   * Mavjud buyurtmaning yo'l kirasi (T-004) — moderator yo'nalishni
   * belgilaganda. Kalkulyator bilan AYNAN bir yo'l: filial tarifi → mijoz
   * transport qoidalari → hisob. Mahsulot narxiga TEGILMAYDI (snapshot,
   * CLAUDE.md qoida 8) — faqat yo'l kira.
   */
  async deliveryForOrder(
    context: QuotePricingContext,
    route: Required<QuoteRoute>,
    totalPallets: number,
  ): Promise<{ transport: CalculatedTransport; tariff: ActiveTariff }> {
    const [tariff, rules] = await Promise.all([
      this.delivery.requireActiveTariff(
        context.branchId,
        route.regionId,
        route.transportTypeId,
      ),
      context.customerId
        ? this.pricingRules.findForCustomer(context.customerId)
        : Promise.resolve({ product: [], transport: [] }),
    ]);
    const transport = this.calculator.calculateDelivery(
      this.toTransportInput(tariff),
      totalPallets,
      rules.transport,
    );
    return { transport, tariff };
  }

  /**
   * Mijoz tokenidan: ID, filial, menejer.
   *
   * 🔒 Filial `BranchScopeService` orqali TOKENDAN — va bazadagi bilan
   *    solishtiriladi. Access token 15 daqiqa yashaydi: shu orada mijoz
   *    boshqa filialga o'tkazilsa, eski token eski filial narxini berardi.
   *    Mos kelmasa — 401; frontend refresh qiladi, refresh esa filialni
   *    bazadan qayta o'qiydi (B-015). O'chirilgan hisob ham — 401.
   */
  async requireCustomer(actor: Actor | undefined): Promise<QuoteCustomer> {
    if (actor?.type !== 'CUSTOMER') {
      throw new ForbiddenException('Bu amal faqat optom mijoz uchun');
    }
    const branchId = this.branchScope.requireBranchId(actor);

    const customer = await this.prisma.customer.findUnique({
      where: { id: actor.id },
      select: {
        isActive: true,
        branchId: true,
        managerId: true,
        branch: { select: { type: true } },
      },
    });
    if (!customer?.isActive) {
      throw new UnauthorizedException('Hisob faol emas');
    }
    if (customer.branchId !== branchId) {
      throw new UnauthorizedException(
        'Hisob ma’lumotlari o‘zgargan — qayta kiring',
      );
    }

    return {
      customerId: actor.id,
      branchId,
      managerId: customer.managerId,
      isAgent: customer.branch.type === BranchType.CENTRAL,
    };
  }

  /**
   * 🔒 Mahsulot MIJOZ FILIALIDA sotilishi shart (BranchProduct faol) va
   *    vitrinada ko'rinishi kerak. Biror mahsulot mos kelmasa — 404, qaysi
   *    ekani aytiladi (mijoz o'z savatini tuzatishi uchun). Boshqa filial
   *    narxi hech qachon ishlatilmaydi.
   */
  async build(
    context: QuotePricingContext,
    items: QuoteItemDto[],
    route: QuoteRoute,
  ): Promise<BuiltQuote> {
    if (Boolean(route.regionId) !== Boolean(route.transportTypeId)) {
      throw new BadRequestException(
        'regionId va transportTypeId birga yuborilishi kerak',
      );
    }

    await this.assertBranchActive(context.branchId);
    const productIds = [...new Set(items.map((item) => item.productId))];

    const [branchProducts, tariff, rules] = await Promise.all([
      this.prisma.branchProduct.findMany({
        where: {
          branchId: context.branchId,
          productId: { in: productIds },
          isActive: true,
          product: { isActive: true, factory: { isActive: true } },
        },
        select: {
          pricePerSqm: true,
          product: {
            select: {
              id: true,
              name: true,
              factoryId: true,
              sqmPerPallet: true,
              weightPerPallet: true,
            },
          },
        },
      }),
      route.regionId && route.transportTypeId
        ? this.delivery.requireActiveTariff(
            context.branchId,
            route.regionId,
            route.transportTypeId,
          )
        : Promise.resolve(null),
      context.customerId
        ? this.pricingRules.findForCustomer(context.customerId)
        : Promise.resolve({ product: [], transport: [] }),
    ]);

    const byId = new Map(branchProducts.map((row) => [row.product.id, row]));
    const missing = productIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(
        `Mahsulot topilmadi yoki filialingizda sotilmaydi: ${missing.join(', ')}`,
      );
    }

    const result = this.calculator.calculate({
      items: items.map((item) => {
        const row = byId.get(item.productId)!;
        return {
          productId: row.product.id,
          factoryId: row.product.factoryId,
          pallets: item.pallets,
          sqmPerPallet: row.product.sqmPerPallet,
          weightPerPallet: row.product.weightPerPallet,
          basePricePerSqm: row.pricePerSqm,
        };
      }),
      transport: tariff ? this.toTransportInput(tariff) : null,
      productRules: rules.product,
      transportRules: rules.transport,
    });

    return {
      result,
      productNames: new Map(
        branchProducts.map((row) => [row.product.id, row.product.name]),
      ),
      tariff,
    };
  }

  /**
   * Yopilgan (faol emas) filial narx ham, buyurtma ham bermaydi. Bitta joyda:
   * kalkulyator, mijoz buyurtmasi va qo'lda kiritilgan buyurtma shu yerdan.
   */
  private async assertBranchActive(branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { isActive: true },
    });
    if (!branch?.isActive) {
      throw new ForbiddenException('Filial hozircha buyurtma qabul qilmaydi');
    }
  }

  private toTransportInput(tariff: ActiveTariff) {
    return {
      branchRegionTariffId: tariff.id,
      capacityPallets: tariff.transportType.capacityPallets,
      basePricePerVehicle: tariff.price,
    };
  }

  private toDeliveryDto(
    transport: CalculatedTransport,
    tariff: ActiveTariff,
  ): DeliveryResponseDto {
    return {
      transportTypeId: tariff.transportType.id,
      transportTypeName: tariff.transportType.name,
      regionName: tariff.region.name,
      capacityPallets: transport.capacityPallets,
      vehicleCount: transport.vehicleCount,
      unitPrice: transport.unitPrice.toString(),
      total: transport.total.toString(),
    };
  }
}
