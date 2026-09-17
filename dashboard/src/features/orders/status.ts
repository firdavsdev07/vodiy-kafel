import { z } from 'zod';
import type { Schema } from '@/shared/api';
import type { OrderStatus } from '@/shared/lib/status-tone';

export type ChangeStatusBody = Schema<'ChangeOrderStatusDto'>;

/**
 * Tugmalar (D-026, G8) — FAQAT `allowedNextStatuses` dan. O'tish matritsasi
 * frontendda TAKRORLANMAYDI: bu yerda faqat ajratish — oldinga yurish va
 * bekor qilish (u alohida, xavfli ko'rinishda va sabab so'raladi).
 */
export function statusActions(allowed: readonly OrderStatus[]): { forward: OrderStatus[]; canCancel: boolean } {
  return {
    forward: allowed.filter((s) => s !== 'CANCELLED'),
    canCancel: allowed.includes('CANCELLED'),
  };
}

/**
 * Izoh — MIJOZ holatlar tarixida ko'radi (backend: maxLength 500).
 * Bekor qilishda sabab MAJBURIY: mijoz "nega bekor bo'ldi" deb so'raydi,
 * backend esa ixtiyoriy qoldirgan — bu UI talabi (task.txt D-026).
 */
export function statusNoteSchema(target: OrderStatus) {
  const note = z.string().trim().max(500, 'Ko‘pi bilan 500 ta belgi');
  return z.object({
    note: target === 'CANCELLED' ? note.min(3, 'Bekor qilish sababini yozing (kamida 3 ta belgi)') : note,
  });
}

export type StatusNoteValues = z.infer<ReturnType<typeof statusNoteSchema>>;

/** Bo'sh izoh yuborilmaydi — tarixda `null` bo'lib qoladi. */
export function toChangeStatusBody(status: OrderStatus, v: StatusNoteValues): ChangeStatusBody {
  return { status, ...(v.note ? { note: v.note } : {}) };
}
