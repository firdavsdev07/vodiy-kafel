import { ApiError } from '@/shared/api/api-error';

/**
 * Xato → odam tushunadigan matn (D-008). `ErrorState` va `toast.error`
 * shu yerdan o'qiydi. Backend `message` matni o'zbekcha keladi — 4xx da
 * aynan o'sha ko'rsatiladi; 5xx ichki tafsilot bermaydi.
 */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Kutilmagan xato. Sahifani yangilab ko‘ring.';
  if (error.isNetworkError) return error.message;
  switch (error.statusCode) {
    case 401:
      return 'Sessiya tugadi. Qayta kiring.';
    case 403:
      return 'Bu amal uchun ruxsatingiz yo‘q.';
    // 🔒 "begonaniki" ham 404 — "ruxsat yo'q" DEYILMAYDI (api/docs/error-codes.md)
    case 404:
      return 'Topilmadi. U o‘chirilgan yoki sizga ko‘rinmaydi.';
    // Multer limiti — backend matni inglizcha ("File too large") keladi
    case 413:
      return 'Fayl juda katta. Ruxsat etilgan hajmdan kichik fayl tanlang.';
    case 429:
      return 'Juda ko‘p so‘rov. Birozdan so‘ng qayta urinib ko‘ring.';
  }
  if (error.statusCode >= 500) return 'Serverda xato. Qayta urinib ko‘ring.';
  return error.messages.length > 0 ? error.messages.join('\n') : error.message;
}

/** Qo'llab-quvvatlash uchun — server logidan so'rovni topish (ApiError bo'lmasa yo'q). */
export function errorRequestId(error: unknown): string | undefined {
  return error instanceof ApiError ? error.requestId : undefined;
}
