import { test } from 'vitest'
import assert from 'node:assert/strict'

import { ORDER_STATUS_LABEL, formatDateTime, trackModel } from '../src/shared/api/orders.js'
import { galleryItemModel } from '../src/shared/api/gallery.js'
import { findSetting } from '../src/shared/api/settings.js'

/** S-027 / S-028 / S-029 — uch kichik model, uchtasi ham chegara holatlari bilan. */

test('trackModel — tarix eng yangisidan boshlanadi', () => {
  const result = trackModel({
    orderNumber: 'VK-2026-000001',
    status: 'SEARCHING_TRANSPORT',
    createdAt: '2026-09-17T20:55:43.199Z',
    regionName: "Farg'ona",
    // Server tartibiga ATAYLAB ishonilmaydi — teskari berib ko'ramiz.
    statusHistory: [
      { status: 'SEARCHING_TRANSPORT', createdAt: '2026-09-18T09:00:00.000Z' },
      { status: 'NEW', createdAt: '2026-09-17T20:55:43.199Z' },
    ],
  })

  assert.deepEqual(result.history.map((h) => h.status), ['SEARCHING_TRANSPORT', 'NEW'])
  assert.equal(result.statusLabel, 'Mashina qidirilmoqda')
  assert.equal(result.isFinal, false)
  assert.equal(result.isCancelled, false)
})

test('trackModel — yakuniy va bekor qilingan holat', () => {
  const base = { orderNumber: 'X', createdAt: '2026-09-17T20:55:43.199Z', statusHistory: [] }
  assert.equal(trackModel({ ...base, status: 'DELIVERED' }).isFinal, true)
  const cancelled = trackModel({ ...base, status: 'CANCELLED' })
  assert.equal(cancelled.isCancelled, true)
  assert.equal(cancelled.statusLabel, 'Bekor qilindi')
})

test('trackModel — olib ketishda viloyat `null`', () => {
  // `regionName: null` — yetkazib berish yo'q, mijoz o'zi oladi.
  const result = trackModel({
    orderNumber: 'X',
    status: 'NEW',
    createdAt: '2026-09-17T20:55:43.199Z',
    statusHistory: [],
  })
  assert.equal(result.regionName, null)
})

test('ORDER_STATUS_LABEL — oltita holatning hammasi o‘zbekcha', () => {
  const keys = ['NEW', 'SEARCHING_TRANSPORT', 'LOADING', 'DELIVERING', 'DELIVERED', 'CANCELLED']
  for (const key of keys) assert.ok(ORDER_STATUS_LABEL[key], `${key} uchun matn yo‘q`)
})

test('formatDateTime — o‘qiladigan sana, buzuq qiymatda bo‘sh satr', () => {
  assert.match(formatDateTime('2026-09-17T20:55:43.199Z'), /^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/)
  assert.equal(formatDateTime('shunaqa sana yo‘q'), '')
})

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

test('findSetting — kalit bor, yo‘q va bo‘sh ro‘yxat', () => {
  const settings = [{ key: 'payment.requisites', value: { bank: 'Hamkorbank' } }]
  assert.deepEqual(findSetting(settings, 'payment.requisites'), { bank: 'Hamkorbank' })
  assert.equal(findSetting(settings, 'stock.lowThresholdPallets'), undefined)
  assert.equal(findSetting(undefined, 'payment.requisites'), undefined)
})
