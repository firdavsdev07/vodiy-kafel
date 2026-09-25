import { z } from 'zod';
import type { Schema } from '@/shared/api';
import { zRequiredText, zUzPhone } from '@/shared/lib/validation';

export type CreateCustomerBody = Schema<'CreateCustomerDto'>;

/** Backend `LOGIN_PATTERN` — kichik harfga keltirilgandan keyin tekshiriladi. */
export const LOGIN_RE = /^[a-z0-9][a-z0-9._-]{2,63}$/;

/**
 * Mijoz yaratish (D-021) — backend `CreateCustomerDto` bilan bir xil.
 * 🔒 `branchId` faqat SUPER_ADMIN / MODERATOR uchun (majburiy); filial xodimi uchun
 * maydon umuman yo'q (G5) — backend o'z filialiga yozadi.
 * ⚠ Self-registration YO'Q — mijozni faqat xodim yaratadi.
 */
export function customerCreateSchema(allBranches: boolean) {
  return z.object({
    login: z
      .string()
      .trim()
      .toLowerCase()
      .regex(LOGIN_RE, 'Login: 3–64 belgi, lotin harf/raqam va . _ - (boshida harf yoki raqam)'),
    companyName: zRequiredText(200),
    inn: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d{9}$/.test(v), 'INN 9 ta raqamdan iborat bo‘lishi kerak'),
    contactName: zRequiredText(150),
    phone: zUzPhone(),
    branchId: allBranches ? z.string().min(1, 'Filialni tanlang') : z.string(),
  });
}

export type CustomerFormInput = z.input<ReturnType<typeof customerCreateSchema>>;
export type CustomerFormValues = z.output<ReturnType<typeof customerCreateSchema>>;

export const customerDefaults: CustomerFormInput = {
  login: '',
  companyName: '',
  inn: '',
  contactName: '',
  phone: '',
  branchId: '',
};

export function toCreateCustomerBody(v: CustomerFormValues, allBranches: boolean): CreateCustomerBody {
  return {
    login: v.login,
    companyName: v.companyName,
    contactName: v.contactName,
    phone: v.phone,
    ...(v.inn ? { inn: v.inn } : {}),
    ...(allBranches && v.branchId ? { branchId: v.branchId } : {}),
  };
}

/** Kompaniya nomidan login taklifi: "Farg'ona Qurilish" → "fargona-qurilish". */
export function suggestLogin(companyName: string): string {
  const map: Record<string, string> = { ʻ: '', "'": '', '‘': '', '’': '', ʼ: '', '"': '' };
  return companyName
    .toLowerCase()
    .replace(/[ʻ'‘’ʼ"]/g, (c) => map[c] ?? '')
    .replace(/(mchj|ooo|llc|xk|aj)\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
