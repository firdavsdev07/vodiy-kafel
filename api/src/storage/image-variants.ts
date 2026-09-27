import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import sharp from 'sharp';
import { UPLOADS_URL_PREFIX } from './local-disk.storage';
import { derivedFileUrl } from './storage.interface';

/**
 * Rasm variantlari (T-014) — `srcset` uchun kichraytirilgan webp nusxalar.
 *
 * Nega: backend avval bitta o'lcham berardi, telefon 3–4 MB lik asl rasmni
 * yuklab olardi (storefront S-032). Endi yuklash paytida uchta kenglik
 * yasaladi va javobda ularning manzillari keladi.
 */
export const IMAGE_VARIANT_WIDTHS = [400, 800, 1600] as const;
export type ImageVariantWidth = (typeof IMAGE_VARIANT_WIDTHS)[number];

export const IMAGE_VARIANT_EXTENSION = 'webp';

/**
 * 🔒 "Dekompressiya bombasi" chegarasi: 10 MB lik fayl ichida 30000×30000
 *    piksel yashiringan bo'lishi mumkin — ochilganda gigabaytlab xotira.
 *    40 MP (masalan 8000×5000) har qanday telefon/fotoapparat suratidan katta.
 */
const MAX_INPUT_PIXELS = 40_000_000;
const WEBP_QUALITY = 78;

/** Variant fayl qo'shimchasi: `800w` (`<uuid>-800w.webp`). */
export const variantSuffix = (width: ImageVariantWidth): string => `${width}w`;

/** Faqat o'zimiz yuklagan raster rasmlarning varianti bor. */
const VARIANT_SOURCE = new RegExp(
  `^${UPLOADS_URL_PREFIX}/[a-z-]+/[0-9a-f-]+\\.(jpg|jpeg|png|webp)$`,
  'i',
);

export function hasImageVariants(url: string | null | undefined): boolean {
  return typeof url === 'string' && VARIANT_SOURCE.test(url);
}

/** Javobdagi variantlar — `srcset` uchun tayyor manzillar. */
export class ImageVariantsDto {
  @ApiProperty({ example: '/uploads/products/0b6f1c1e-400w.webp' })
  w400!: string;

  @ApiProperty({ example: '/uploads/products/0b6f1c1e-800w.webp' })
  w800!: string;

  @ApiProperty({ example: '/uploads/products/0b6f1c1e-1600w.webp' })
  w1600!: string;
}

/** Swagger'dagi umumiy izoh — har bir `…Variants` maydoni uchun. */
export const IMAGE_VARIANTS_DESCRIPTION =
  'Kichraytirilgan webp nusxalar (400 / 800 / 1600 px kenglik) — `srcset` ' +
  'uchun. Asl rasm kichikroq bo‘lsa kattalashtirilmaydi (fayl bor, lekin ' +
  'kengligi asliniki). `null` — rasm yo‘q yoki video / tashqi havola.';

/**
 * Asl rasm manzilidan variant manzillari. Variant bo'lmaydigan manzil
 * (bo'sh, video, tashqi havola) — `null`.
 */
export function imageVariants(
  url: string | null | undefined,
): ImageVariantsDto | null {
  if (!url || !hasImageVariants(url)) return null;
  const at = (width: ImageVariantWidth) =>
    derivedFileUrl(url, variantSuffix(width), IMAGE_VARIANT_EXTENSION);
  return { w400: at(400), w800: at(800), w1600: at(1600) };
}

export interface RenderedVariant {
  width: ImageVariantWidth;
  buffer: Buffer;
}

/**
 * Rasmdan uchta webp variant yasaydi. Hammasi xotirada — hech narsa
 * saqlanmaydi (saqlash chaqiruvchining ishi).
 *
 * - EXIF bo'yicha buriladi (telefon surati yonboshlab qolmasin), EXIF'ning
 *   o'zi (GPS ham) variantga O'TMAYDI
 * - Asl rasmdan katta qilinmaydi (`withoutEnlargement`)
 *
 * Rasmni ochib bo'lmasa (imzo to'g'ri, lekin ichi buzuq) yoki u juda
 * katta bo'lsa — 400: bunday fayl baribir saytda ko'rinmasdi.
 */
export async function renderImageVariants(
  buffer: Buffer,
): Promise<RenderedVariant[]> {
  try {
    const source = sharp(buffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
    }).rotate();
    return await Promise.all(
      IMAGE_VARIANT_WIDTHS.map(async (width) => ({
        width,
        buffer: await source
          .clone()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer(),
      })),
    );
  } catch {
    throw new BadRequestException(
      'Rasmni o‘qib bo‘lmadi — fayl buzilgan yoki juda katta (40 MP gacha)',
    );
  }
}
