import { test } from 'vitest'
import assert from 'node:assert/strict'

import { galleryItemModel } from '../src/shared/api/gallery.js'

/** S-027 — galereya modeli, chegara holatlari bilan. */

test('galleryItemModel — mahsulot havolasi `/catalog/:slug` bo‘ladi', () => {
  // ⚠ Backend izohida `/products/:slug` deyilgan — u BACKEND yo'li.
  const item = galleryItemModel({
    id: 'g1',
    imageUrl: 'https://cdn.vodiykafel.uz/g/1.jpg',
    title: "Farg'onadagi loyiha",
    product: { id: 'p1', name: 'Lyuks Granit Bej', slug: 'lyuks-granit-bej' },
  })
  assert.equal(item.product.to, '/catalog/lyuks-granit-bej')
  assert.equal(item.image, 'https://cdn.vodiykafel.uz/g/1.jpg')
})

test('galleryItemModel — mahsulotsiz va sarlavhasiz surat', () => {
  const item = galleryItemModel({ id: 'g2', imageUrl: '/uploads/gallery/x.jpg', product: null })
  assert.equal(item.product, null, 'bo‘sh havola yasalmasligi kerak')
  assert.equal(item.title, null)
  assert.ok(item.image.endsWith('/uploads/gallery/x.jpg'))
})
