import { test } from 'vitest'
import assert from 'node:assert/strict'

import { groupMedia, productCardModel } from '../src/shared/api/catalog.js'
import { variantSrcSet } from '../src/shared/api/config.js'

/**
 * `catalog.js` — backend DTO'sini sahifa shakliga keltiruvchi qatlam (S-023).
 * Aynan shu yerda xato bo'lsa sahifa jim buziladi (bo'sh rasm, yo'q maydon),
 * shuning uchun tekshiriladigan narsa — chegara holatlari.
 *
 * Modulga React ham, brauzer ham kerak emas: u faqat toza funksiyalar
 * (hook'lar shu faylda bo'lsa ham, chaqirilmaydi).
 */

test('groupMedia — turlarga ajratadi va tartibni saqlaydi', () => {
  const { images, frames, videos } = groupMedia([
    { id: 'a', url: '/uploads/p/1.jpg', type: 'IMAGE' },
    { id: 'b', url: '/uploads/p/360-1.jpg', type: 'IMAGE_360' },
    { id: 'c', url: '/uploads/p/2.jpg', type: 'IMAGE' },
    { id: 'd', url: '/uploads/p/360-2.jpg', type: 'IMAGE_360' },
    { id: 'e', url: '/uploads/p/tur.mp4', type: 'VIDEO_360' },
  ])

  assert.deepEqual(images.map((m) => m.id), ['a', 'c'])
  assert.deepEqual(frames.map((m) => m.id), ['b', 'd'])
  assert.deepEqual(videos.map((m) => m.id), ['e'])
})

test('groupMedia — manzil to‘liq bo‘ladi, tashqi manzil tegilmaydi', () => {
  const { images } = groupMedia([
    { id: 'a', url: '/uploads/p/1.jpg', type: 'IMAGE' },
    { id: 'b', url: 'https://cdn.vodiykafel.uz/p/1.jpg', type: 'IMAGE' },
  ])

  assert.ok(images[0].src.endsWith('/uploads/p/1.jpg'))
  assert.ok(images[0].src.startsWith('http'), 'nisbiy yo‘l to‘liq manzilga aylanishi kerak')
  assert.equal(images[1].src, 'https://cdn.vodiykafel.uz/p/1.jpg')
})

test('groupMedia — media yo‘q yoki buzuq yozuv sahifani yiqitmaydi', () => {
  assert.deepEqual(groupMedia(undefined), { images: [], frames: [], videos: [] })
  assert.deepEqual(groupMedia([{ id: 'a', type: 'IMAGE' }]).images, [], 'url yo‘q — tashlanadi')
})

test('productCardModel — kartaning hamma maydoni to‘ladi', () => {
  const card = productCardModel({
    id: 'p1',
    name: 'Metro Vintage',
    slug: 'metro-vintage',
    factory: { id: 'f1', name: 'Metro Ceramics', slug: 'metro-ceramics' },
    size: { id: 's1', label: '30x60', widthCm: 30, heightCm: 60 },
    surface: 'DEVOR',
    color: 'terrakota',
    primaryImageUrl: 'https://cdn.vodiykafel.uz/p/10-1.jpg',
    availability: 'AVAILABLE',
  })

  assert.deepEqual(card, {
    id: 'p1',
    slug: 'metro-vintage',
    name: 'Metro Vintage',
    collection: 'Metro Ceramics',
    categoryLabel: 'Devor uchun',
    size: '30x60',
    finish: 'terrakota',
    src: 'https://cdn.vodiykafel.uz/p/10-1.jpg',
    // Tashqi havola — backend variant bermaydi (T-014)
    srcSet: undefined,
  })
})

test('productCardModel — rang va rasm yo‘q bo‘lsa ham ishlaydi', () => {
  const card = productCardModel({
    id: 'p2',
    name: 'Pol Klassik',
    slug: 'pol-klassik',
    factory: { id: 'f1', name: 'HUA TAO', slug: 'hua-tao' },
    size: { id: 's1', label: '60x60', widthCm: 60, heightCm: 60 },
    surface: 'POL',
    color: null,
    primaryImageUrl: null,
    availability: 'UNAVAILABLE',
  })

  // Rang yo'q — o'rnini yuza turi egallaydi, karta bo'sh qolmaydi.
  assert.equal(card.finish, 'Pol uchun')
  // Rasm yo'q — bo'sh satr, ya'ni `SmartImage` o'z o'rin egallovchisini
  // ko'rsatadi (namuna katalogining rasmiga tushib ketmaydi).
  assert.equal(card.src, '')
})

test('variantSrcSet — backend variantlari srcset satriga (T-014)', () => {
  const srcSet = variantSrcSet({
    w400: '/uploads/products/a-400w.webp',
    w800: '/uploads/products/a-800w.webp',
    w1600: '/uploads/products/a-1600w.webp',
  })
  const parts = srcSet.split(', ')
  assert.equal(parts.length, 3)
  assert.match(parts[0], /^https?:\/\/.+\/uploads\/products\/a-400w\.webp 400w$/)
  assert.ok(parts[2].endsWith('/uploads/products/a-1600w.webp 1600w'))
  assert.equal(variantSrcSet(null), undefined)
  assert.equal(variantSrcSet(undefined), undefined)
})

test('karta va media variantlarni oladi (T-014)', () => {
  const variants = { w400: '/uploads/p/x-400w.webp', w800: '/uploads/p/x-800w.webp', w1600: '/uploads/p/x-1600w.webp' }
  const card = productCardModel({ id: 'p', slug: 'p', name: 'P', primaryImageUrl: '/uploads/p/x.jpg', primaryImageVariants: variants })
  assert.ok(card.srcSet.includes('x-800w.webp 800w'))

  const { images, videos } = groupMedia([
    { id: '1', type: 'IMAGE', url: '/uploads/p/x.jpg', variants },
    { id: '2', type: 'VIDEO_360', url: '/uploads/p/v.mp4', variants: null },
  ])
  assert.ok(images[0].srcSet.includes('x-400w.webp 400w'))
  assert.equal(videos[0].srcSet, undefined)
})
