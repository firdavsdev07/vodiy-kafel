import { BadRequestException } from '@nestjs/common';
import { detectFileKind, type FileKind } from './file-signature';

/** Multer'dan kelgan fayl — faqat bizga kerakli maydonlar. */
export interface UploadedFileData {
  buffer: Buffer;
  size: number;
}

/**
 * Yuklash limiti (multer `limits.fileSize`). Undan katta fayl diskka
 * yetmay turib 413 bilan to'xtaydi.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Fayl bor va turi ruxsat etilganmi — tekshiradi.
 *
 * Tur MAZMUNDAN aniqlanadi ([[file-signature]]) — `kind` kengaytma sifatida
 * ishlatiladi.
 */
export const requireFileKind = (
  file: UploadedFileData | undefined,
  allowed: readonly FileKind[],
  message: string,
): { buffer: Buffer; kind: FileKind } => {
  if (!file?.size) throw new BadRequestException('Fayl yuborilmadi');

  const kind = detectFileKind(file.buffer);
  if (!kind || !allowed.includes(kind)) throw new BadRequestException(message);
  return { buffer: file.buffer, kind };
};
