import { env } from '@/shared/config/env';

/**
 * Backend yuklangan fayl yo'li → to'liq manzil. `/uploads/...` global
 * prefiksdan (`/api/v1`) TASHQARIDA beriladi (api main.ts), shuning uchun
 * API manzilining faqat origin qismi olinadi. Tashqi havola — o'zgarmaydi.
 */
export function resolveAssetUrl(path: string | null | undefined, apiUrl = env.apiUrl): string | undefined {
  const value = path?.trim();
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.startsWith('/')) return undefined; // `javascript:` va nisbiy yo'llar — ko'rsatilmaydi
  return `${new URL(apiUrl).origin}${value}`;
}
