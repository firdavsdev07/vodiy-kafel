import type { StaffRole } from '@/shared/auth/profile';

export interface StaffOption {
  value: string;
  label: string;
}

/**
 * Kimni biriktirish mumkin (D-027) — nomzodlar manbasi roliga qarab:
 *
 *   SUPER_ADMIN, BRANCH_ADMIN — `GET /admin/managers?branchId=<buyurtma filiali>`
 *   MODERATOR — menejerlar ro'yxati unga YOPIQ (backend @Roles), shuning
 *               uchun faqat "o'zimga biriktirish" (moderator ham
 *               biriktiriladigan rol). To'liq ro'yxat — api/task.txt B-062.
 *
 * Joriy biriktirilgan xodim ro'yxatda bo'lmasa ham (masalan faolsizlantirilgan)
 * variant sifatida qoladi — aks holda select uni "Tanlang" deb ko'rsatib,
 * xodimni chalg'itardi.
 */
export function assignOptions(input: {
  role: StaffRole | undefined;
  me: { id: string; fullName: string } | undefined;
  managers: readonly { id: string; fullName: string }[] | undefined;
  current: { id: string; fullName: string } | null;
}): StaffOption[] {
  const options: StaffOption[] =
    input.role === 'MODERATOR'
      ? input.me
        ? [{ value: input.me.id, label: `${input.me.fullName} (men)` }]
        : []
      : (input.managers ?? []).map((m) => ({ value: m.id, label: m.fullName }));

  if (input.current && !options.some((o) => o.value === input.current?.id)) {
    options.unshift({ value: input.current.id, label: `${input.current.fullName} (hozirgi)` });
  }
  return options;
}
