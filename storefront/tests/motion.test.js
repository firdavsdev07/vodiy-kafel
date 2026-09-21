import { afterEach, test, vi } from 'vitest'
import assert from 'node:assert/strict'

import { allowHeavyMotion, prefersReducedMotion } from '../src/lib/motion.js'

/**
 * Harakat byudjeti (S-020, S-041).
 *
 * ⚠ `motion.js` `matchMedia` ni CHAQIRILGAN PAYTDA so'raydi (modul
 *   yuklanganda emas), shuning uchun uni test ichida almashtirsa
 *   bo'ladi. Agar kelajakda natija modul darajasida keshlansa, bu
 *   test yiqiladi — va bu to'g'ri, chunki o'shanda foydalanuvchi
 *   sozlamani o'zgartirsa sayt sezmay qolardi.
 */

const realMatchMedia = window.matchMedia
const realNavigator = { ...navigator }

afterEach(() => {
  window.matchMedia = realMatchMedia
  vi.unstubAllGlobals()
})

function setReducedMotion(reduced) {
  window.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })
}

test('prefers-reduced-motion: reduce → harakat O‘CHADI', () => {
  setReducedMotion(true)
  assert.equal(prefersReducedMotion(), true)
  assert.equal(allowHeavyMotion(), false, 'og‘ir effektlar ham taqiqlanadi')
})

test('prefers-reduced-motion yo‘q → harakat ishlaydi', () => {
  setReducedMotion(false)
  assert.equal(prefersReducedMotion(), false)
  assert.equal(allowHeavyMotion(), true)
})

test('zaif qurilma — `hardwareConcurrency <= 2` og‘ir effektni to‘xtatadi', () => {
  setReducedMotion(false)
  vi.stubGlobal('navigator', { ...realNavigator, hardwareConcurrency: 2 })
  assert.equal(allowHeavyMotion(), false)
  assert.equal(prefersReducedMotion(), false, 'reveal‘lar esa QOLADI (S-020)')
})

test('4 yadro ZAIF EMAS — chegara ataylab qattiq', () => {
  // 4 ni chegara qilish XATO bo'lardi: o'rta darajadagi juda ko'p
  // qurilma aynan 4 yadroli (S-020 izohi).
  setReducedMotion(false)
  vi.stubGlobal('navigator', { ...realNavigator, hardwareConcurrency: 4 })
  assert.equal(allowHeavyMotion(), true)
})

test('trafik tejash yoqilgan bo‘lsa — og‘ir effekt yo‘q', () => {
  setReducedMotion(false)
  vi.stubGlobal('navigator', { ...realNavigator, hardwareConcurrency: 8, connection: { saveData: true } })
  assert.equal(allowHeavyMotion(), false)
})
