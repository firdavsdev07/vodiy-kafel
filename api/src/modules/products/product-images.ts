import type { MediaType } from '../../prisma/prisma-client';
import {
  imageVariants,
  type ImageVariantsDto,
} from '../../storage/image-variants';

/**
 * Mahsulot suratlari → javob (T-014). Ochiq katalog ham, optom mijoz
 * kabineti ham SHU yerdan o'tadi — `srcset` variantlari ikkalasida bir xil.
 */

/** Karta surati va uning `srcset` variantlari. */
export function primaryImage(url: string | null): {
  primaryImageUrl: string | null;
  primaryImageVariants: ImageVariantsDto | null;
} {
  return { primaryImageUrl: url, primaryImageVariants: imageVariants(url) };
}

/** Media elementi. 360° videoda variant yo'q — asl fayl beriladi. */
export function mediaItem(item: { id: string; url: string; type: MediaType }): {
  id: string;
  url: string;
  variants: ImageVariantsDto | null;
  type: MediaType;
} {
  return {
    id: item.id,
    url: item.url,
    variants: item.type === 'VIDEO_360' ? null : imageVariants(item.url),
    type: item.type,
  };
}
