import { assetUrl } from './config.js'
import { useApiQuery } from './useApiQuery.js'

/**
 * Loyiha galereyasi — `GET /gallery` (S-027).
 *
 * Bu katalog EMAS: bular haqiqiy obyektlardagi suratlar. Har bir surat
 * mahsulotga bog'langan bo'lishi MUMKIN (majburiy emas) — bog'langani
 * bo'lsa, odam "shu yuza qaysi mahsulot?" degan savolga bir bosishda
 * javob oladi.
 *
 * ⚠ Sahifalash `data` ICHIDA keladi (`items`/`total`/`totalPages`),
 *   `meta` da EMAS — `client.js` dagi izohga qarang.
 */

export function useGallery({ page = 1, limit = 24 } = {}) {
  return useApiQuery('/gallery', { params: { page, limit } })
}

/**
 * `GalleryPublicItemDto` → sahifa shakli.
 *
 * ⚠ `product` `null` bo'lishi mumkin: bog'lanmagan yoki mahsulot
 *   vitrinadan olib tashlangan. Sahifa buni "havolasiz surat" deb
 *   ko'rsatadi, bo'sh havola yasamaydi.
 *
 * ⚠ Mahsulot manzili — `/catalog/:slug`. Backend izohida `/products/:slug`
 *   deyilgan, lekin u BACKEND yo'li; saytdagi marshrut `/catalog/:slug`
 *   (`src/App.jsx`). Ikkisini adashtirmaslik kerak.
 */
export function galleryItemModel(dto) {
  return {
    id: dto.id,
    title: dto.title || null,
    image: assetUrl(dto.imageUrl),
    product: dto.product ? { name: dto.product.name, to: `/catalog/${dto.product.slug}` } : null,
  }
}
