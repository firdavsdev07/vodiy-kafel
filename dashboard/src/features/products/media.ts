import type { Schema } from '@/shared/api';

export type ProductMedia = Schema<'ProductMediaAdminResponseDto'>;
export type MediaType = ProductMedia['type'];

export const MEDIA_TYPES = ['IMAGE', 'IMAGE_360', 'VIDEO_360'] as const satisfies readonly MediaType[];

/** Backend `MAX_UPLOAD_BYTES` — 10 MB. Katta faylni yubormasdan oldin aytamiz (trafik tejaladi). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** `<input accept>` — faqat tanlash oynasi uchun qulaylik. Haqiqiy tekshiruv BACKENDDA (fayl mazmuni). */
export const ACCEPT: Record<MediaType, string> = {
  IMAGE: 'image/jpeg,image/png,image/webp',
  IMAGE_360: 'image/jpeg,image/png,image/webp',
  VIDEO_360: 'video/mp4',
};

/**
 * Yuborishdan oldingi tekshiruv — faqat HAJM va aniq nomuvofiqlik (video
 * turiga rasm). ⚠ Kengaytma/MIME ga ishonilmaydi: backend faylni
 * mazmunidan aniqlaydi, uning xabari ko'rsatiladi.
 */
export function precheckFile(file: File, type: MediaType): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return `Fayl ${formatBytes(file.size)} — 10 MB dan katta`;
  if (file.size === 0) return 'Fayl bo‘sh';
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (type === 'VIDEO_360' && isImage) return '360° video uchun MP4 fayl tanlang';
  if (type !== 'VIDEO_360' && isVideo) return 'Video uchun turni “360° video” qiling';
  return null;
}

/** Fayl tanlanganda tur taxmini: MP4 → 360° video, qolgani — joriy tanlov. */
export function guessType(file: File, current: MediaType): MediaType {
  if (file.type === 'video/mp4') return 'VIDEO_360';
  return current === 'VIDEO_360' ? 'IMAGE' : current;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
