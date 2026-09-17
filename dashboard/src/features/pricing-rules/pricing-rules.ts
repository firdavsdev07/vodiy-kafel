import { z } from 'zod';
import type { Schema } from '@/shared/api';
import { formatMoney, normalizeDecimal } from '@/shared/lib/format';

export type PricingRule = Schema<'PricingRuleAdminDto'>;
export type CreatePricingRuleBody = Schema<'CreatePricingRuleDto'>;

export type PricingDomain = PricingRule['domain'];
export type PricingScope = PricingRule['scope'];
export type PricingValueType = PricingRule['type'];

/**
 * Qaysi domenda qaysi doira bo'lishi mumkin — backenddagi
 * `SCOPES_BY_DOMAIN` ning aynan nusxasi (pricing-rules-admin.service.ts).
 * Mos kelmasa backend 400 qaytaradi, shuning uchun forma ham shu ro'yxatdan
 * tashqari variant ko'rsatmaydi.
 */
export const SCOPES_BY_DOMAIN = {
  PRODUCT: ['PRODUCT', 'FACTORY', 'ALL'],
  TRANSPORT: ['ROUTE', 'ALL'],
} as const satisfies Record<PricingDomain, readonly PricingScope[]>;

export const domainLabel = {
  PRODUCT: 'Mahsulot narxi',
  TRANSPORT: 'Yo‘l kira',
} as const satisfies Record<PricingDomain, string>;

export const scopeLabel = {
  PRODUCT: 'Aynan shu mahsulotga',
  FACTORY: 'Shu zavodning barcha mahsulotiga',
  ROUTE: 'Aynan shu yo‘nalishga',
  ALL: 'Umumiy — barchasiga',
} as const satisfies Record<PricingScope, string>;

export const typeLabel = {
  FIXED: 'Aniq narx (so‘m)',
  PERCENT: 'Foiz',
} as const satisfies Record<PricingValueType, string>;

/**
 * Narx zanjiri — ENG ANIQ qoida yutadi (api/CLAUDE.md qoida 11).
 * UI shu tartibni ko'rsatadi, chunki xodim "nega bu narx chiqdi" degan
 * savolga javobni shu yerdan topadi.
 */
export const CHAIN_ORDER: readonly { scope: PricingScope; text: string }[] = [
  { scope: 'PRODUCT', text: 'Mijoz + aynan shu mahsulot' },
  { scope: 'FACTORY', text: 'Mijoz + zavod' },
  { scope: 'ALL', text: 'Mijozga umumiy qoida' },
];

/** `scope=ALL` dan boshqasida `scopeId` MAJBURIY (backend ham shuni talab qiladi). */
export function needsTarget(scope: PricingScope): boolean {
  return scope !== 'ALL';
}

/** Doira → qaysi ma'lumotnomadan tanlanadi. */
export function targetKind(scope: PricingScope): 'product' | 'factory' | 'tariff' | null {
  switch (scope) {
    case 'PRODUCT':
      return 'product';
    case 'FACTORY':
      return 'factory';
    case 'ROUTE':
      return 'tariff';
    case 'ALL':
      return null;
  }
}

/**
 * Filial admini uchun chegara — `pricing.branchAdminMaxDiscountPercent`.
 * `0` bo'lsa u UMUMAN qoida qo'sha olmaydi (backend: "ruxsati sozlanmagan").
 * SUPER_ADMIN uchun chegara yo'q — `null`.
 */
export type DiscountLimit = { maxDiscountPercent: number } | null;

export interface RuleFormContext {
  /** Filial admini chegarasi; SUPER_ADMIN da `null`. */
  limit: DiscountLimit;
}

const zValue = z.string().trim().min(1, 'Qiymat kiriting');

/**
 * Forma sxemasi. Backend `assertShape` va `assertBranchAdminLimit`
 * tekshiruvlarini AYNAN takrorlaydi — xodim 400 xatoni serverdan kutmasin.
 * ⚠ Bu qulaylik uchun; haqiqiy himoya baribir backendda.
 */
export function ruleSchema(ctx: RuleFormContext) {
  return z
    .object({
      domain: z.enum(['PRODUCT', 'TRANSPORT']),
      scope: z.enum(['PRODUCT', 'FACTORY', 'ROUTE', 'ALL']),
      scopeId: z.string().trim(),
      type: z.enum(['FIXED', 'PERCENT']),
      value: zValue,
    })
    .superRefine((v, c) => {
      const allowed: readonly PricingScope[] = SCOPES_BY_DOMAIN[v.domain];
      if (!allowed.includes(v.scope)) {
        c.addIssue({ code: 'custom', path: ['scope'], message: 'Bu domenga mos emas' });
      }
      if (needsTarget(v.scope) && !v.scopeId) {
        c.addIssue({ code: 'custom', path: ['scopeId'], message: 'Tanlang' });
      }

      const num = Number(v.value.replace(',', '.'));
      if (!Number.isFinite(num)) {
        c.addIssue({ code: 'custom', path: ['value'], message: 'Son kiriting' });
        return;
      }
      if (v.type === 'FIXED' && num <= 0) {
        c.addIssue({ code: 'custom', path: ['value'], message: 'Narx musbat bo‘lishi kerak' });
      }
      if (v.type === 'PERCENT' && num <= -100) {
        c.addIssue({ code: 'custom', path: ['value'], message: 'Foiz −100 dan katta bo‘lishi kerak' });
      }

      // ── Filial admini cheklovlari ──
      if (!ctx.limit) return;
      const max = ctx.limit.maxDiscountPercent;
      if (v.type !== 'PERCENT') {
        c.addIssue({ code: 'custom', path: ['type'], message: 'Siz faqat foizli chegirma bera olasiz' });
        return;
      }
      if (num >= 0) {
        c.addIssue({ code: 'custom', path: ['value'], message: 'Faqat chegirma — manfiy foiz (masalan −10)' });
        return;
      }
      if (-num > max) {
        c.addIssue({
          code: 'custom',
          path: ['value'],
          message:
            max === 0
              ? 'Sizga chegirma berish ruxsati sozlanmagan'
              : `Chegirma ${max}% dan oshmasligi kerak`,
        });
      }
    });
}

export type RuleFormValues = z.infer<ReturnType<typeof ruleSchema>>;

export function ruleDefaults(limit: DiscountLimit): RuleFormValues {
  return {
    domain: 'PRODUCT',
    scope: 'PRODUCT',
    scopeId: '',
    // Filial admini faqat PERCENT qo'ya oladi — boshqasini tanlatib,
    // keyin xato ko'rsatishdan ko'ra darhol to'g'risini qo'yamiz.
    type: limit ? 'PERCENT' : 'FIXED',
    value: '',
  };
}

/** Forma qiymatlari → so'rov tanasi. `scope=ALL` da `scopeId` YUBORILMAYDI. */
export function toCreateBody(v: RuleFormValues): CreatePricingRuleBody {
  return {
    domain: v.domain,
    scope: v.scope,
    type: v.type,
    value: v.value.trim().replace(',', '.'),
    ...(needsTarget(v.scope) ? { scopeId: v.scopeId } : {}),
  };
}

/**
 * Qoida qiymatini o'qiladigan matnga: `"-10.0000"` → `−10%`,
 * `"78000.0000"` → `78 000 so‘m`.
 *
 * ⚠ G6: pul SATR ustida formatlanadi (`formatMoney`), `Number()` ga
 *   aylantirilmaydi. Foiz — pul emas, kichik son: uning ishorasi satrdan,
 *   raqami `normalizeDecimal` bilan olinadi (`"-5.0000"` → `5`).
 */
export function formatRuleValue(rule: Pick<PricingRule, 'type' | 'value'>): string {
  const raw = rule.value.trim();
  if (rule.type === 'PERCENT') {
    const negative = raw.startsWith('-');
    const digits = normalizeDecimal(negative ? raw.slice(1) : raw);
    return `${negative ? '−' : '+'}${digits}%`;
  }
  return formatMoney(raw);
}

/**
 * Chegirmami — badge rangi uchun.
 * ⚠ FIXED "chegirma" emas: u bazaviy narxdan past ham, baland ham bo'lishi
 *   mumkin va buni faqat narx zanjirini hisoblagach bilish mumkin.
 */
export function isDiscount(rule: Pick<PricingRule, 'type' | 'value'>): boolean {
  return rule.type === 'PERCENT' && rule.value.trim().startsWith('-');
}
