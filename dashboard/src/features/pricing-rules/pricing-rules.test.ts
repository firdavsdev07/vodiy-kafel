import { describe, expect, it } from 'vitest';
import {
  formatRuleValue,
  isDiscount,
  needsTarget,
  ruleDefaults,
  ruleSchema,
  SCOPES_BY_DOMAIN,
  targetKind,
  toCreateBody,
  type RuleFormValues,
} from './pricing-rules';

/**
 * ⚠ Bu testlar backend `assertShape` / `assertBranchAdminLimit` bilan bir
 *   xil qoidalarni tekshiradi (pricing-rules-admin.service.ts). Backend
 *   qoidasi o'zgarsa — shu testlar ham yangilanishi SHART, aks holda forma
 *   xodimni "to'g'ri" deb aldab, 400 ni serverdan oldiradi.
 */

const superAdmin = { limit: null };
const branchAdmin = { limit: { maxDiscountPercent: 20 } };

const values = (over: Partial<RuleFormValues> = {}): RuleFormValues => ({
  domain: 'PRODUCT',
  scope: 'PRODUCT',
  scopeId: 'p1',
  type: 'FIXED',
  value: '78000',
  ...over,
});

const check = (ctx: typeof superAdmin | typeof branchAdmin, v: RuleFormValues) =>
  ruleSchema(ctx).safeParse(v);

const errorOn = (r: ReturnType<typeof check>, path: string) =>
  r.success ? [] : r.error.issues.filter((i) => i.path.join('.') === path).map((i) => i.message);

describe('doira va domen mosligi', () => {
  it('TRANSPORT domenida faqat ROUTE va ALL bor', () => {
    expect(SCOPES_BY_DOMAIN.TRANSPORT).toEqual(['ROUTE', 'ALL']);
    expect(SCOPES_BY_DOMAIN.PRODUCT).toEqual(['PRODUCT', 'FACTORY', 'ALL']);
  });

  it('TRANSPORT + PRODUCT — rad etiladi', () => {
    const r = check(superAdmin, values({ domain: 'TRANSPORT', scope: 'PRODUCT' }));
    expect(errorOn(r, 'scope')).not.toEqual([]);
  });

  it('TRANSPORT + ROUTE — o‘tadi', () => {
    expect(check(superAdmin, values({ domain: 'TRANSPORT', scope: 'ROUTE', scopeId: 't1' })).success).toBe(true);
  });
});

describe('nishon (scopeId)', () => {
  it('ALL da nishon KERAK EMAS', () => {
    expect(needsTarget('ALL')).toBe(false);
    expect(check(superAdmin, values({ scope: 'ALL', scopeId: '' })).success).toBe(true);
  });

  it('ALL dan boshqasida nishon majburiy', () => {
    const r = check(superAdmin, values({ scope: 'FACTORY', scopeId: '' }));
    expect(errorOn(r, 'scopeId')).toEqual(['Tanlang']);
  });

  it('doira → qaysi ma‘lumotnomadan tanlanadi', () => {
    expect(targetKind('PRODUCT')).toBe('product');
    expect(targetKind('FACTORY')).toBe('factory');
    expect(targetKind('ROUTE')).toBe('tariff');
    expect(targetKind('ALL')).toBeNull();
  });

  it('ALL da `scopeId` so‘rovga YUBORILMAYDI', () => {
    const body = toCreateBody(values({ scope: 'ALL', scopeId: 'qoldiq' }));
    expect(body).not.toHaveProperty('scopeId');
  });

  it('nishonli doirada `scopeId` yuboriladi', () => {
    expect(toCreateBody(values({ scope: 'FACTORY', scopeId: 'f1' })).scopeId).toBe('f1');
  });
});

describe('qiymat — barcha rollar uchun', () => {
  it('FIXED musbat bo‘lishi kerak', () => {
    expect(errorOn(check(superAdmin, values({ value: '0' })), 'value')).not.toEqual([]);
    expect(errorOn(check(superAdmin, values({ value: '-5' })), 'value')).not.toEqual([]);
    expect(check(superAdmin, values({ value: '1' })).success).toBe(true);
  });

  it('PERCENT −100 dan katta bo‘lishi kerak', () => {
    const at = check(superAdmin, values({ type: 'PERCENT', value: '-100' }));
    expect(errorOn(at, 'value')).not.toEqual([]);
    expect(check(superAdmin, values({ type: 'PERCENT', value: '-99.9' })).success).toBe(true);
  });

  it('son bo‘lmagan qiymat rad etiladi', () => {
    expect(errorOn(check(superAdmin, values({ value: 'arzon' })), 'value')).toEqual(['Son kiriting']);
  });

  it('vergul nuqtaga aylanadi (10,5 → 10.5)', () => {
    expect(toCreateBody(values({ type: 'PERCENT', value: ' -10,5 ' })).value).toBe('-10.5');
  });
});

describe('🔒 filial admini cheklovlari', () => {
  it('FIXED qo‘ya olmaydi', () => {
    const r = check(branchAdmin, values({ type: 'FIXED', value: '78000' }));
    expect(errorOn(r, 'type')).toEqual(['Siz faqat foizli chegirma bera olasiz']);
  });

  it('ustama (musbat foiz) qo‘ya olmaydi — faqat chegirma', () => {
    const r = check(branchAdmin, values({ type: 'PERCENT', value: '5' }));
    expect(errorOn(r, 'value')).not.toEqual([]);
  });

  it('chegaradan chuqur chegirma rad etiladi', () => {
    expect(errorOn(check(branchAdmin, values({ type: 'PERCENT', value: '-25' })), 'value')).toEqual([
      'Chegirma 20% dan oshmasligi kerak',
    ]);
  });

  it('aynan chegaradagi chegirma o‘tadi', () => {
    expect(check(branchAdmin, values({ type: 'PERCENT', value: '-20' })).success).toBe(true);
  });

  it('chegara 0 — umuman chegirma bera olmaydi', () => {
    const ctx = { limit: { maxDiscountPercent: 0 } };
    expect(errorOn(check(ctx, values({ type: 'PERCENT', value: '-1' })), 'value')).toEqual([
      'Sizga chegirma berish ruxsati sozlanmagan',
    ]);
  });

  it('SUPER_ADMIN uchun chegara YO‘Q', () => {
    expect(check(superAdmin, values({ type: 'PERCENT', value: '-90' })).success).toBe(true);
    expect(check(superAdmin, values({ type: 'FIXED', value: '78000' })).success).toBe(true);
  });

  it('forma filial adminiga darhol PERCENT bilan ochiladi', () => {
    expect(ruleDefaults(branchAdmin.limit).type).toBe('PERCENT');
    expect(ruleDefaults(null).type).toBe('FIXED');
  });
});

describe('ko‘rsatish', () => {
  it('foiz ishorasi bilan', () => {
    expect(formatRuleValue({ type: 'PERCENT', value: '-10' })).toBe('−10%');
    expect(formatRuleValue({ type: 'PERCENT', value: '5' })).toBe('+5%');
  });

  it('API Decimal to‘ldirilgan nollari tozalanadi', () => {
    // Backend `Decimal(10,4)` beradi: "-5.0000" → "−5%", "78000.0000" → pul
    expect(formatRuleValue({ type: 'PERCENT', value: '-5.0000' })).toBe('−5%');
    expect(formatRuleValue({ type: 'PERCENT', value: '-10.5000' })).toBe('−10.5%');
  });

  it('aniq narx umumiy pul formatida (G6 — satr ustida)', () => {
    expect(formatRuleValue({ type: 'FIXED', value: '78000.0000' })).toBe('78\u202f000 so‘m');
  });

  it('chegirmani ustamadan ajratadi', () => {
    expect(isDiscount({ type: 'PERCENT', value: '-10' })).toBe(true);
    expect(isDiscount({ type: 'PERCENT', value: '5' })).toBe(false);
    expect(isDiscount({ type: 'PERCENT', value: '-5.0000' })).toBe(true);
    // FIXED "chegirma" emas — u bazaviy narxdan past ham, baland ham bo'lishi mumkin
    expect(isDiscount({ type: 'FIXED', value: '1' })).toBe(false);
  });
});
