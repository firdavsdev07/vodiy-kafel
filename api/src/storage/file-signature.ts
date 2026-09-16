/** Qabul qilinadigan fayl turlari — kengaytma shu yerdan olinadi. */
export type FileKind = 'jpg' | 'png' | 'webp' | 'mp4';

export const IMAGE_KINDS: readonly FileKind[] = ['jpg', 'png', 'webp'];
export const VIDEO_KINDS: readonly FileKind[] = ['mp4'];

/**
 * MP4 brendlari. Brend tekshirilmasa, xuddi shu `ftyp` qutisi bilan
 * boshlanadigan HEIC surat yoki MOV ham `.mp4` bo'lib saqlanib, brauzerda
 * ochilmasdi.
 */
const MP4_BRANDS = [
  'isom',
  'iso2',
  'iso4',
  'iso5',
  'iso6',
  'mp41',
  'mp42',
  'avc1',
  'dash',
  'M4V ',
];

const startsWith = (buffer: Buffer, bytes: number[], offset = 0): boolean =>
  buffer.length >= offset + bytes.length &&
  bytes.every((byte, i) => buffer[offset + i] === byte);

const ascii = (text: string): number[] =>
  [...text].map((char) => char.charCodeAt(0));

/**
 * Fayl turini MAZMUNIDAN (birinchi baytlar) aniqlaydi.
 *
 * 🔒 Brauzer yuborgan `Content-Type` va fayl nomi TEKSHIRILMAYDI — ikkalasi
 *    ham mijoz qo'lida. `rasm.jpg` nomi bilan HTML yoki SVG yuklansa va
 *    `/uploads` dan berilsa, u sayt domenida skript ishga tushirardi
 *    (stored XSS). Kengaytma ham shu natijadan olinadi, nomdan emas.
 */
export const detectFileKind = (buffer: Buffer): FileKind | null => {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'jpg';
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png';
  }
  if (
    startsWith(buffer, ascii('RIFF')) &&
    startsWith(buffer, ascii('WEBP'), 8)
  ) {
    return 'webp';
  }
  // ISO BMFF: 4 bayt quti uzunligi, `ftyp`, keyin brend.
  if (
    startsWith(buffer, ascii('ftyp'), 4) &&
    MP4_BRANDS.some((brand) => startsWith(buffer, ascii(brand), 8))
  ) {
    return 'mp4';
  }
  return null;
};
