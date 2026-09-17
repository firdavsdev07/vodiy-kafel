import type { Schema } from '@/shared/api';
import { roleLabel } from '@/shared/lib/labels';

export type AssignableStaff = Schema<'AssignableStaffDto'>;

export interface StaffOption {
  value: string;
  label: string;
}

/**
 * Kimni biriktirish mumkin (D-027) — YAGONA manba:
 * `GET /admin/orders/{id}/assignable-staff` (api B-062).
 *
 * ⚠ AVVAL: SUPER_ADMIN/BRANCH_ADMIN `GET /admin/managers` dan olardi,
 *   MODERATOR ga esa u endpoint YOPIQ edi — shuning uchun moderator
 *   faqat "o'zimga biriktirish" ni ko'rardi, BRANCH_ADMIN ni esa hech
 *   kim tanlay olmasdi (biriktirish qabul qiladigan rollar ro'yxati
 *   bilan mos kelmasdi). B-066 dan keyin backend buyurtma filialining
 *   AYNAN biriktirish mumkin bo'lgan xodimlarini qaytaradi.
 *
 * Roli yorliqda ko'rsatiladi: bir filialda bir xil ismli menejer va
 * filial admini bo'lishi mumkin, ularni ajratib turish kerak.
 * "(men)" — o'zini tanlash ko'p uchraydigan holat, ko'zga tashlanib turadi.
 *
 * Joriy biriktirilgan xodim ro'yxatda bo'lmasa ham (masalan
 * faolsizlantirilgan) variant sifatida qoladi — aks holda select uni
 * "Tanlang" deb ko'rsatib, xodimni chalg'itardi.
 */
export function assignOptions(input: {
  staff: readonly AssignableStaff[] | undefined;
  me: { id: string } | undefined;
  current: { id: string; fullName: string } | null;
}): StaffOption[] {
  const options: StaffOption[] = (input.staff ?? []).map((person) => ({
    value: person.id,
    label:
      `${person.fullName} — ${roleLabel[person.role]}` +
      (person.id === input.me?.id ? ' (men)' : ''),
  }));

  if (input.current && !options.some((o) => o.value === input.current?.id)) {
    options.unshift({ value: input.current.id, label: `${input.current.fullName} (hozirgi)` });
  }
  return options;
}
