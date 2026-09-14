import { z } from 'zod';
import { FALLBACK_LOW_STOCK_THRESHOLD } from '../../common/utils/stock-status.util';

const text = (label: string) =>
  z
    .string({ error: `${label} — matn bo‘lishi kerak` })
    .trim()
    .min(1, `${label} bo‘sh bo‘lmasligi kerak`)
    .max(200, `${label} — 200 belgidan oshmasin`);

const digits = (label: string, count: number) =>
  z
    .string({ error: `${label} — ${count} ta raqam (satr)` })
    .regex(new RegExp(`^\\d{${count}}$`), `${label} — ${count} ta raqam`);

/** Bank rekvizitlari — perechislenie (shartnoma bo'yicha o'tkazma) uchun. */
const paymentRequisitesSchema = z.strictObject(
  {
    bank: text('Bank nomi'),
    mfo: digits('MFO', 5),
    account: digits('Hisob raqam', 20),
    inn: digits('INN', 9),
    name: text('Tashkilot nomi'),
  },
  {
    error: (issue) =>
      issue.code === 'unrecognized_keys'
        ? `Noma’lum maydon: ${issue.keys.join(', ')}`
        : 'Rekvizitlar obyekt bo‘lishi kerak',
  },
);

/** Butun son, [min, max] oralig'ida. */
const integer = (min: number, max: number) =>
  z
    .number({ error: 'Son bo‘lishi kerak' })
    .int('Butun son bo‘lishi kerak')
    .min(min, `${min} dan kichik bo‘lmasin`)
    .max(max, `${max} dan katta bo‘lmasin`);

/**
 * Tizim taniydigan sozlamalar (TZ 4-bo'lim, B-025).
 *
 * ⚠ Nega kodda ro'yxat bor: qiymat hisob-kitobga kiradi. Admin
 *   `stock.lowThresholdPallets` ga `"yigirma"` yozib qo'ysa, zaxira holati
 *   jimgina buzilardi. Har bir kalit o'z sxemasi bilan tekshiriladi,
 *   notanish kalit yaratib bo'lmaydi.
 *
 * ⚠ Qaysi kalit OCHIQ ekanini bu ro'yxat EMAS, bazadagi `isPublic` belgisi
 *   hal qiladi (B-012 qarori). `isPublicByDefault` faqat yozuv bazada hali
 *   yo'q bo'lganda — birinchi PATCH da ishlatiladi.
 *
 * `fallback` — yozuv yo'q yoki buzilgan bo'lsa ishlatiladigan qiymat: bitta
 * noto'g'ri sozlama butun kalkulyatorni to'xtatib qo'ymasligi uchun.
 */
export const SETTING_DEFINITIONS = {
  'stock.lowThresholdPallets': {
    schema: integer(0, 1_000_000),
    fallback: FALLBACK_LOW_STOCK_THRESHOLD,
    isPublicByDefault: false,
    description: '«Kam qoldi» chegarasi (paddon)',
  },
  'payment.requisites': {
    schema: paymentRequisitesSchema.nullable(),
    fallback: null,
    isPublicByDefault: true,
    description: 'Bank rekvizitlari (perechislenie uchun)',
  },
  'pricing.branchAdminMaxDiscountPercent': {
    schema: z
      .number({ error: 'Son bo‘lishi kerak' })
      .min(0, '0 dan kichik bo‘lmasin')
      .max(100, '100 dan katta bo‘lmasin'),
    // Sozlama yo'q bo'lsa filial admini chegirma bera OLMAYDI — "noma'lum"
    // chegara "cheksiz" deb talqin qilinmasligi kerak.
    fallback: 0,
    isPublicByDefault: false,
    description: 'Filial admini bera oladigan maksimal chegirma (%)',
  },
} as const;

export type SettingKey = keyof typeof SETTING_DEFINITIONS;

export type SettingValue<K extends SettingKey> = z.infer<
  (typeof SETTING_DEFINITIONS)[K]['schema']
>;

export const SETTING_KEYS = Object.keys(SETTING_DEFINITIONS) as SettingKey[];

export const isSettingKey = (key: string): key is SettingKey =>
  Object.hasOwn(SETTING_DEFINITIONS, key);
