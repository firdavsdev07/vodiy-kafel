import type { DownloadedFile } from '@/shared/api';

/**
 * Token bilan olingan faylni (Blob) foydalanuvchiga saqlashga berish.
 *
 * ⚠ NEGA `<a href>` EMAS: himoyalangan fayl (masalan shartnoma PDF si)
 *   faqat `Authorization` sarlavhasi bilan beriladi, oddiy havola esa
 *   sarlavha yubormaydi — 401 keladi. Shuning uchun fayl `fetch` bilan
 *   olinadi, so'ng vaqtinchalik `blob:` havola orqali saqlanadi.
 *
 * Havola darhol bo'shatiladi: aks holda blob sahifa yopilguncha xotirada
 * qolib ketadi.
 */
export function saveDownloadedFile(file: DownloadedFile, fallbackName: string): void {
  const url = URL.createObjectURL(file.blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename ?? fallbackName;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    // Brauzer yuklashni boshlab yuborishga ulgursin
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
