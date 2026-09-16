import { BadRequestException, Injectable } from '@nestjs/common';
import {
  sumMoney,
  toMoney,
  ZERO_MONEY,
  type Money,
} from '../../common/utils/money.util';
import { Prisma } from '../../prisma';
import {
  PricingResolverService,
  type PricingRuleInput,
} from '../pricing/pricing-resolver.service';

export interface CalculatorItemInput {
  productId: string;
  /** Zavod qoidasi (B-054, FACTORY darajasi) uchun. */
  factoryId: string;
  pallets: number;
  sqmPerPallet: Prisma.Decimal.Value;
  weightPerPallet: Prisma.Decimal.Value;
  /** Filialning BAZAVIY narxi (`BranchProduct.pricePerSqm`). */
  basePricePerSqm: Prisma.Decimal.Value;
}

export interface CalculatorTransportInput {
  /** `BranchRegionTariff.id` — ROUTE qoidasi uchun. */
  branchRegionTariffId: string;
  capacityPallets: number;
  /** Bitta transport vositasining BAZAVIY yo'l kirasi. */
  basePricePerVehicle: Prisma.Decimal.Value;
}

export interface CalculatorInput {
  items: readonly CalculatorItemInput[];
  /** `null` — yetkazib berish yo'q (olib ketish). */
  transport: CalculatorTransportInput | null;
  /** Mijozning shu domendagi qoidalari; mijozsiz hisobda — bo'sh. */
  productRules: readonly PricingRuleInput[];
  transportRules: readonly PricingRuleInput[];
}

export interface CalculatedItem {
  productId: string;
  pallets: number;
  sqm: Money;
  weightKg: Money;
  /** YAKUNIY narx (qoida qo'llangan) — buyurtmada surat sifatida saqlanadi. */
  pricePerSqm: Money;
  lineTotal: Money;
}

export interface CalculatedTransport {
  vehicleCount: number;
  capacityPallets: number;
  unitPrice: Money;
  total: Money;
}

export interface CalculationResult {
  items: CalculatedItem[];
  totalPallets: number;
  totalSqm: Money;
  totalWeightKg: Money;
  itemsTotal: Money;
  transport: CalculatedTransport | null;
  deliveryTotal: Money;
  grandTotal: Money;
}

const MONEY_SCALE = 2;

/**
 * Buyurtma ustunlari sig'imi. Undan katta qiymat bazada 500 berardi —
 * oldinroq, tushunarli 400 bilan to'xtatamiz.
 *   pul (narx, summa)   Decimal(14, 2)
 *   m² (qator, jami)    Decimal(12, 4)
 *   kg (qator, jami)    Decimal(12, 3)
 * Jami qiymat har bir qatordan katta yoki teng — shuning uchun jamini
 * tekshirish yetarli; narx esa qatorga ko'paytirilmagan holda saqlanadi.
 */
const MAX_MONEY = toMoney('999999999999.99');
const MAX_SQM = toMoney('99999999.9999');
const MAX_WEIGHT_KG = toMoney('999999999.999');

/**
 * Hisoblash yadrosi (B-026, TZ 3.3) — kalkulyator ham, buyurtma ham SHU
 * funksiyadan o'tadi (CLAUDE.md qoida 1: narx faqat backendda).
 *
 * ⚠ SOF FUNKSIYA: HTTP yo'q, baza yo'q. Kerakli ma'lumotni chaqiruvchi
 *   yig'ib beradi. Narx zanjiri (B-054) shu yerning ICHIDA qo'llanadi —
 *   chaqiruvchi uni chetlab bazaviy narx bilan hisoblay olmaydi.
 *
 *   sqm        = pallets × sqmPerPallet
 *   weightKg   = pallets × weightPerPallet
 *   lineTotal  = sqm × pricePerSqm            (2 xonagacha, har qatorda)
 *   itemsTotal = Σ lineTotal
 *   vehicles   = ceil(Σ pallets / capacityPallets)
 *   delivery   = vehicles × unitPrice
 *   grandTotal = itemsTotal + delivery
 *
 * Qator summasi AVVAL yumaloqlanadi, keyin qo'shiladi: buyurtmada har bir
 * qator alohida saqlanadi va `itemsTotal` ularning yig'indisiga aynan teng
 * bo'lishi kerak.
 */
@Injectable()
export class CalculatorService {
  constructor(private readonly pricing: PricingResolverService) {}

  calculate(input: CalculatorInput): CalculationResult {
    this.validate(input);

    const items = input.items.map((item) =>
      this.calculateItem(item, input.productRules),
    );

    const totalPallets = items.reduce((sum, item) => sum + item.pallets, 0);
    const itemsTotal = sumMoney(items.map((item) => item.lineTotal));

    const transport = input.transport
      ? this.calculateDelivery(
          input.transport,
          totalPallets,
          input.transportRules,
        )
      : null;
    const deliveryTotal = transport?.total ?? ZERO_MONEY;
    const grandTotal = itemsTotal.add(deliveryTotal);

    const totalSqm = sumMoney(items.map((item) => item.sqm));
    const totalWeightKg = sumMoney(items.map((item) => item.weightKg));

    if (
      grandTotal.gt(MAX_MONEY) ||
      items.some((item) => item.pricePerSqm.gt(MAX_MONEY))
    ) {
      throw new BadRequestException(
        'Buyurtma summasi juda katta — paddon sonini kamaytiring',
      );
    }
    if (totalSqm.gt(MAX_SQM) || totalWeightKg.gt(MAX_WEIGHT_KG)) {
      throw new BadRequestException(
        'Buyurtma hajmi (m² yoki og‘irlik) juda katta — paddon sonini kamaytiring',
      );
    }

    return {
      items,
      totalPallets,
      totalSqm,
      totalWeightKg,
      itemsTotal,
      transport,
      deliveryTotal,
      grandTotal,
    };
  }

  private calculateItem(
    item: CalculatorItemInput,
    rules: readonly PricingRuleInput[],
  ): CalculatedItem {
    const { finalPrice } = this.pricing.resolve(
      rules,
      {
        domain: 'PRODUCT',
        productId: item.productId,
        factoryId: item.factoryId,
      },
      item.basePricePerSqm,
    );
    const sqm = toMoney(item.sqmPerPallet).mul(item.pallets);

    return {
      productId: item.productId,
      pallets: item.pallets,
      sqm,
      weightKg: toMoney(item.weightPerPallet).mul(item.pallets),
      pricePerSqm: finalPrice,
      lineTotal: sqm
        .mul(finalPrice)
        .toDecimalPlaces(MONEY_SCALE, Prisma.Decimal.ROUND_HALF_UP),
    };
  }

  /**
   * Faqat yo'l kira — "Yo'l kira hisoblash" tugmasi uchun (TZ 3.3). To'liq
   * hisobda ham aynan shu funksiya ishlatiladi.
   */
  calculateDelivery(
    transport: CalculatorTransportInput,
    totalPallets: number,
    rules: readonly PricingRuleInput[],
  ): CalculatedTransport {
    this.assertPallets(totalPallets);

    const { finalPrice } = this.pricing.resolve(
      rules,
      {
        domain: 'TRANSPORT',
        branchRegionTariffId: transport.branchRegionTariffId,
      },
      transport.basePricePerVehicle,
    );
    // Yarim mashina bo'lmaydi: 21 paddon, 20 sig'im → 2 ta mashina.
    const vehicleCount = Math.ceil(totalPallets / transport.capacityPallets);

    return {
      vehicleCount,
      capacityPallets: transport.capacityPallets,
      unitPrice: finalPrice,
      total: finalPrice.mul(vehicleCount),
    };
  }

  private validate({ items }: CalculatorInput): void {
    if (items.length === 0) {
      throw new BadRequestException('Kamida bitta mahsulot bo‘lishi kerak');
    }

    const seen = new Set<string>();
    for (const item of items) {
      this.assertPallets(item.pallets);
      // Bir mahsulot ikki qatorda kelsa — buyurtmada ikki xil narx surati
      // paydo bo'lishi mumkin edi. Frontend paddonlarni o'zi qo'shsin.
      if (seen.has(item.productId)) {
        throw new BadRequestException(
          'Bir mahsulot ro‘yxatda faqat bir marta bo‘lishi kerak',
        );
      }
      seen.add(item.productId);
    }
  }

  private assertPallets(pallets: number): void {
    if (!Number.isSafeInteger(pallets) || pallets < 1) {
      throw new BadRequestException(
        'Paddon soni musbat butun son bo‘lishi kerak',
      );
    }
  }
}
