import { Injectable } from '@nestjs/common';
import {
  PricingDomain,
  PricingScope,
  PricingValueType,
} from '../../common/enums';
import { toMoney, type Money } from '../../common/utils/money.util';
import { Prisma } from '../../prisma';

/** Narx zanjiri uchun kerakli qoida maydonlari (`PricingRule` dan). */
export interface PricingRuleInput {
  id: string;
  domain: PricingDomain;
  scope: PricingScope;
  productId: string | null;
  factoryId: string | null;
  branchRegionTariffId: string | null;
  type: PricingValueType;
  value: Prisma.Decimal.Value;
}

/** Narxlanayotgan narsa — domen bilan birga, aralashtirib bo'lmaydi. */
export type PricingTarget =
  | { domain: 'PRODUCT'; productId: string; factoryId: string }
  | { domain: 'TRANSPORT'; branchRegionTariffId: string };

export interface PricingResult {
  finalPrice: Money;
  /**
   * 🔒 Qaysi qoida ishlagani — FAQAT ichki loglash uchun. API javobiga
   *    hech qachon chiqmaydi (TZ 3.3.1: chegirma sababi sir).
   */
  ruleId: string | null;
}

/** Narxlar so'mda, 2 xonagacha (`Decimal(14, 2)`). */
const PRICE_SCALE = 2;

/**
 * Eng kichik narx — 1 tiyin. Juda kichik bazaviy narxga katta foizli chegirma
 * `0.00` ga yumaloqlanib, narx surati CHECK (> 0) da 500 berardi va bepul
 * mahsulot hosil qilardi.
 */
const MIN_PRICE = toMoney('0.01');

/**
 * Individual narx zanjiri (B-054, TZ 3.3.1 va 3.14) — YAGONA joy.
 *
 * ⚠ SOF FUNKSIYA: HTTP ham, baza ham yo'q. Chaqiruvchi mijozning shu
 *   domendagi barcha qoidalarini BITTA so'rovda oladi va shu yerga beradi.
 *   Mahsulot narxi ham, yo'l kira ham shu funksiyadan o'tadi — ikkinchi
 *   nusxa yozilmaydi.
 *
 * Ustunlik (eng aniq qoida yutadi):
 *   PRODUCT:   aynan mahsulot → zavod → ALL → bazaviy filial narxi
 *   TRANSPORT: aynan yo'nalish → ALL → bazaviy tarif
 *
 * Bir mijozga bir darajada bitta qoida — baza kafolatlaydi (partial unique
 * indekslar, B-052), shuning uchun bu yerda "ikkitasi bo'lsa qaysi" degan
 * tanlov yo'q.
 */
@Injectable()
export class PricingResolverService {
  resolve(
    rules: readonly PricingRuleInput[],
    target: PricingTarget,
    basePrice: Prisma.Decimal.Value,
  ): PricingResult {
    const base = toMoney(basePrice);
    const rule = this.pickRule(rules, target);

    if (!rule) return { finalPrice: base, ruleId: null };
    return { finalPrice: this.apply(rule, base), ruleId: rule.id };
  }

  private pickRule(
    rules: readonly PricingRuleInput[],
    target: PricingTarget,
  ): PricingRuleInput | undefined {
    // Boshqa domen qoidasi hech qachon qo'llanmaydi: mahsulotga berilgan
    // "ALL −10%" yo'l kiraga tushib qolmasligi kerak.
    const own = rules.filter((rule) => rule.domain === target.domain);
    const byScope = (
      scope: PricingScope,
      matches: (r: PricingRuleInput) => boolean,
    ) => own.find((rule) => rule.scope === scope && matches(rule));

    if (target.domain === 'PRODUCT') {
      return (
        byScope(
          PricingScope.PRODUCT,
          (r) => r.productId === target.productId,
        ) ??
        byScope(
          PricingScope.FACTORY,
          (r) => r.factoryId === target.factoryId,
        ) ??
        byScope(PricingScope.ALL, () => true)
      );
    }

    return (
      byScope(
        PricingScope.ROUTE,
        (r) => r.branchRegionTariffId === target.branchRegionTariffId,
      ) ?? byScope(PricingScope.ALL, () => true)
    );
  }

  /**
   * FIXED — bazaviy narx o'rniga aniq summa.
   * PERCENT — bazaviy narxga nisbatan; bazaviy narx o'zgarsa, avtomatik
   * moslashadi. Natija 2 xonagacha yarim-yuqoriga yumaloqlanadi.
   */
  private apply(rule: PricingRuleInput, base: Money): Money {
    if (rule.type === PricingValueType.FIXED) return toMoney(rule.value);

    const price = base
      .mul(toMoney(100).add(toMoney(rule.value)))
      .div(100)
      .toDecimalPlaces(PRICE_SCALE, Prisma.Decimal.ROUND_HALF_UP);
    return Prisma.Decimal.max(price, MIN_PRICE);
  }
}
