import { ApiError } from '@/shared/api';

/** Login xatosi → foydalanuvchiga tushunarli matn. */
export function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Kutilmagan xato. Sahifani yangilab ko‘ring.';
  if (error.isNetworkError) return error.message;
  switch (error.statusCode) {
    case 400:
    case 401:
      return 'Telefon raqami yoki parol noto‘g‘ri.';
    case 403:
      return 'Hisobingiz faol emas. Administratorga murojaat qiling.';
    case 429:
      return 'Juda ko‘p urinish. Bir daqiqadan so‘ng qayta urinib ko‘ring.';
    default:
      return error.statusCode >= 500
        ? `Serverda xato. Qayta urinib ko‘ring${error.requestId ? ` (ID: ${error.requestId})` : ''}.`
        : error.message;
  }
}
