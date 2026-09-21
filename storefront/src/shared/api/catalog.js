import { apiPost } from './client.js'
import { assetUrl } from './config.js'
import { useApiQuery } from './useApiQuery.js'

/**
 * Ochiq katalogning domen qatlami (S-023).
 *
 * `client.js` — transport (fetch, xato, kesh). Shu fayl esa backend
 * DTO'larini sahifa tushunadigan ko'rinishga keltiradi: enum'lar
 * o'zbekcha matnga, `/uploads/...` to'liq manzilga, `media[]` esa
 * turlariga qarab ajratiladi.
 *
 * 🔒 Bu yerda NARX ham, ZAXIRA SONI ham yo'q va bo'lmaydi (G1):
 *    ochiq sayt faqat `availability` ni ko'radi — `AVAILABLE` yoki
 *    `UNAVAILABLE`, boshqa hech narsa.
 */

/** `Surface` enum (`api/docs/enums.md`). */
export const SURFACE_LABEL = {
  POL: 'Pol uchun',
  DEVOR: 'Devor uchun',
}

/** `availability` — ATAYLAB ikki holat. Uch rangli indikator kabinetda. */
export const AVAILABILITY_LABEL = {
  AVAILABLE: 'Omborda bor',
  UNAVAILABLE: 'Hozircha yo‘q',
}

/** Mahsulot sahifasi: `GET /products/{slug}` → `ProductDetailResponseDto`. */
export function useProduct(slug) {
  return useApiQuery(slug ? `/products/${encodeURIComponent(slug)}` : null)
}

/**
 * Sahifa ostidagi "shunga o'xshash" bloki.
 * Bo'sh kelishi MUMKIN — server o'zi qaror qiladi (admin bog'lagani +
 * avtomatik to'ldirish), bu xato emas.
 */
export function useSimilarProducts(slug, limit = 3) {
  return useApiQuery(slug ? `/products/${encodeURIComponent(slug)}/similar` : null, {
    params: { limit },
  })
}

/**
 * Bir marta so'ralgan slug'lar. Modul darajasida, ya'ni:
 *   • StrictMode (dev) effektni ikki marta ishga tushirsa ham — bitta so'rov
 *   • sahifa ichida qayta render bo'lsa ham — bitta so'rov
 *   • SPA ichida orqaga-oldinga yurilsa ham — bitta so'rov
 * Sahifa YANGILANSA qaytadan sanaladi: bu haqiqatan yangi tashrif.
 */
const counted = new Set()

/**
 * `POST /products/{slug}/view` — javob tanasi yo'q (204).
 *
 * Xatosi JIM yutiladi: hisoblagich ishlamagani mahsulot sahifasini
 * buzishi mumkin emas. 404 ham shu yerga tushadi (mahsulot orada
 * vitrinadan olingan) — sahifaning o'zi buni allaqachon ko'rsatadi.
 */
export function recordProductView(slug) {
  if (!slug || counted.has(slug)) return
  counted.add(slug)
  apiPost(`/products/${encodeURIComponent(slug)}/view`).catch(() => {})
}

/**
 * `media[]` ni turlari bo'yicha ajratadi — tartibi saqlanadi
 * (server ularni ko'rsatish tartibida beradi).
 *
 * `IMAGE_360` — bitta surat EMAS, kadrlar to'plami: admin har bir
 * kadrni alohida fayl qilib yuklaydi (`product-media.admin.controller.ts`).
 * Shuning uchun ular yig'ilib, bitta aylantirgichga beriladi.
 */
export function groupMedia(media) {
  const images = []
  const frames = []
  const videos = []

  for (const item of media ?? []) {
    if (!item?.url) continue
    const entry = { id: item.id, type: item.type, src: assetUrl(item.url) }
    if (item.type === 'IMAGE_360') frames.push(entry)
    else if (item.type === 'VIDEO_360') videos.push(entry)
    else images.push(entry)
  }

  return { images, frames, videos }
}

/**
 * `ProductListItemResponseDto` → `ProductGrid` kutadigan shakl.
 *
 * Grid hozir ikki manbani ko'radi: mock (`src/data/products.js`) va API.
 * Mock S-022 da o'chadi — o'shanda bu funksiya yagona yo'l bo'lib qoladi.
 */
export function productCardModel(dto) {
  return {
    id: dto.id,
    slug: dto.slug,
    name: dto.name,
    // Kartadagi yuqori qator: mock'da kolleksiya turardi, API'da zavod —
    // katalogda mahsulotni ajratadigan eng ma'noli belgi shu.
    collection: dto.factory?.name ?? '',
    categoryLabel: SURFACE_LABEL[dto.surface] ?? '',
    size: dto.size?.label ?? '',
    finish: dto.color ?? SURFACE_LABEL[dto.surface] ?? '',
    src: assetUrl(dto.primaryImageUrl),
  }
}
