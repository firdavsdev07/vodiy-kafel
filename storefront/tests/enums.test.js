import { test } from 'vitest'
import assert from 'node:assert/strict'

import { AVAILABILITY_LABEL, SURFACE_LABEL } from '../src/shared/api/catalog.js'
import { FINAL_STATUSES, ORDER_STATUS_LABEL } from '../src/shared/api/orders.js'

/**
 * Enum → o'zbekcha matn lug'atlari (S-041).
 *
 * Xavf: backend enum'ga yangi qiymat qo'shadi, sayt esa uni
 * tarjimasiz ko'rsatadi — ekranda `SEARCHING_TRANSPORT` chiqadi.
 * Shu testlar lug'at TO'LIQ ekanini qotirib qo'yadi.
 *
 * ⚠ Ro'yxatlar `api/docs/enums.md` va `api/openapi.json` dagi
 *   qiymatlardan ko'chirilgan. Backend enum'i o'zgarsa SHU TEST
 *   yiqilishi kerak — bu uning vazifasi.
 */

/** `api/docs/enums.md` — OrderStatus. */
const ORDER_STATUSES = [
  'NEW',
  'SEARCHING_TRANSPORT',
  'LOADING',
  'DELIVERING',
  'DELIVERED',
  'CANCELLED',
]

/** `api/openapi.json` — `surface`. */
const SURFACES = ['POL', 'DEVOR']

/** `api/openapi.json` — `availability`. 🔒 ATAYLAB faqat ikkitasi (G1). */
const AVAILABILITIES = ['AVAILABLE', 'UNAVAILABLE']

test('ORDER_STATUS_LABEL — hamma holat tarjima qilingan', () => {
  for (const key of ORDER_STATUSES) {
    assert.ok(ORDER_STATUS_LABEL[key], `${key} uchun o‘zbekcha matn yo‘q`)
    assert.notEqual(ORDER_STATUS_LABEL[key], key, `${key} tarjima emas, o‘zi`)
  }
})

test('ORDER_STATUS_LABEL — ORTIQCHA kalit yo‘q', () => {
  // Backendda yo'q holatni ko'rsatish ham xato: kod eskirganini
  // bildiradi.
  assert.deepEqual(Object.keys(ORDER_STATUS_LABEL).sort(), [...ORDER_STATUSES].sort())
})

test('FINAL_STATUSES — faqat `DELIVERED` va `CANCELLED`', () => {
  // `api/docs/enums.md`: "ulardan chiqish yo'q".
  assert.deepEqual([...FINAL_STATUSES].sort(), ['CANCELLED', 'DELIVERED'])
  for (const key of FINAL_STATUSES) assert.ok(ORDER_STATUSES.includes(key))
})

test('SURFACE_LABEL — ikkala yuza turi ham bor va ortiqchasi yo‘q', () => {
  assert.deepEqual(Object.keys(SURFACE_LABEL).sort(), [...SURFACES].sort())
  for (const key of SURFACES) assert.ok(SURFACE_LABEL[key])
})

test('AVAILABILITY_LABEL — 🔒 ATAYLAB IKKITA holat (G1)', () => {
  // Ochiq saytda uch rangli indikator (IN_STOCK/LOW/OUT_OF_STOCK)
  // BO'LMAYDI — u faqat auth bor joyda. Uchinchi kalit paydo bo'lsa
  // bu test yiqiladi va sabab so'raladi.
  assert.deepEqual(Object.keys(AVAILABILITY_LABEL).sort(), [...AVAILABILITIES].sort())
  assert.equal(Object.keys(AVAILABILITY_LABEL).length, 2)
})

test('lug‘atlarda bo‘sh matn yo‘q', () => {
  for (const dict of [ORDER_STATUS_LABEL, SURFACE_LABEL, AVAILABILITY_LABEL]) {
    for (const [key, value] of Object.entries(dict)) {
      assert.ok(typeof value === 'string' && value.trim().length > 0, `${key} bo‘sh`)
    }
  }
})
