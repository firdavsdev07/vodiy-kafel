import { z } from 'zod';
import type { Schema } from '@/shared/api';
import { formatUzPhone } from '@/shared/lib/format';
import { zRequiredText, zUzPhone } from '@/shared/lib/validation';

export type CustomerDetail = Schema<'AdminCustomerDetailDto'>;
/** ⚠ B-059: generatsiyada `inn`/`managerId` turi noto'g'ri — to'g'rilangan tur. */
export type UpdateCustomerBody = Omit<Schema<'UpdateCustomerDto'>, 'inn' | 'managerId'> & {
  inn?: string | null;
  managerId?: string | null;
};

/**
 * Mijoz profili (D-022). Login O'ZGARMAYDI. `inn: null` / `managerId: null` —
 * tozalash. 🔒 Filialni o'zgartirish — faqat SUPER_ADMIN (mijoz narxi
 * o'zgaradi, eski menejer uziladi).
 */
export const customerProfileSchema = z.object({
  companyName: zRequiredText(200),
  inn: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{9}$/.test(v), 'INN 9 ta raqamdan iborat bo‘lishi kerak'),
  contactName: zRequiredText(150),
  phone: zUzPhone(),
  managerId: z.string(),
  branchId: z.string(),
});

export type ProfileInput = z.input<typeof customerProfileSchema>;
export type ProfileValues = z.output<typeof customerProfileSchema>;

export function profileDefaults(c: CustomerDetail): ProfileInput {
  return {
    companyName: c.companyName,
    inn: c.inn ?? '',
    contactName: c.contactName,
    // PhoneField "+998" prefiksni o'zi ko'rsatadi — formatlangan qiymat
    phone: formatUzPhone(c.phone),
    managerId: c.manager?.id ?? '',
    branchId: c.branch.id,
  };
}

export function toUpdateCustomerBody(
  v: ProfileValues,
  c: CustomerDetail,
  can: { changeBranch: boolean; assignManager: boolean },
): UpdateCustomerBody {
  const body: UpdateCustomerBody = {};
  if (v.companyName !== c.companyName) body.companyName = v.companyName;
  if ((v.inn || null) !== (c.inn ?? null)) body.inn = v.inn || null;
  if (v.contactName !== c.contactName) body.contactName = v.contactName;
  if (v.phone !== c.phone) body.phone = v.phone;
  const branchChanged = can.changeBranch && v.branchId !== c.branch.id;
  if (branchChanged) body.branchId = v.branchId;
  // Filial o'zgarsa — backend eski menejerni o'zi uzadi; yangi filial menejeri alohida tanlanadi
  if (can.assignManager && !branchChanged && (v.managerId || null) !== (c.manager?.id ?? null)) {
    body.managerId = v.managerId || null;
  }
  return body;
}
