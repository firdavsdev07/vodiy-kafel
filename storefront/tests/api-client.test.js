import { afterEach, test, vi } from 'vitest'
import assert from 'node:assert/strict'

import { ApiError, toApiError } from '../src/shared/api/api-error.js'
import { apiGet, isAbortError, requestEnvelope } from '../src/shared/api/client.js'
import { buildQuery, buildUrl } from '../src/shared/api/config.js'

/**
 * API qatlami (S-004, S-041).
 *
 * Bu qatlam butun saytning poydevori: har bir bo'lim shundan o'tadi.
 * Shuning uchun tekshiriladigan narsa — o'ram ochilishi, xatoning
 * `ApiError` ga aylanishi va bekor qilishning xatodan ajratilishi.
 */

afterEach(() => {
  vi.unstubAllGlobals()
})

/** `fetch` o'rniga qo'yiladigan soxta javob. */
function stubFetch(body, { status = 200, headers = {} } = {}) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    headers: { get: (key) => headers[key] ?? null },
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  }
  const spy = vi.fn(async () => response)
  vi.stubGlobal('fetch', spy)
  return spy
}

test('`{ data }` o‘rami OCHILADI — chaqiruvchi `data` ni oladi', async () => {
  stubFetch({ data: { id: 'p1', name: 'Metro Vintage' }, meta: {} })
  const data = await apiGet('/products/metro-vintage')
  assert.deepEqual(data, { id: 'p1', name: 'Metro Vintage' })
})

test('sahifalash `data` ICHIDA keladi, `meta` da emas', async () => {
  // ⚠ S-004 da o'lchangan: `meta` bo'sh keladi, `total`/`totalPages`
  //   esa `data` ning ichida. Shu shartnoma buzilmasin.
  stubFetch({ data: { items: [1, 2], total: 2, totalPages: 1 }, meta: {} })
  const { data, meta } = await requestEnvelope('/gallery')
  assert.equal(data.total, 2)
  assert.deepEqual(meta, {})
})

test('xato status → `ApiError`, serverning o‘z matni bilan', async () => {
  stubFetch(
    { statusCode: 404, error: 'Not Found', message: 'Mahsulot topilmadi' },
    { status: 404 },
  )
  await assert.rejects(apiGet('/products/yoq'), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.statusCode, 404)
    assert.equal(error.isNotFound, true)
    assert.equal(error.message, 'Mahsulot topilmadi')
    assert.equal(error.isRetryable, false, '404 ni qayta so‘rashdan foyda yo‘q')
    return true
  })
})

test('validatsiya xatosi — `message` MASSIV bo‘lsa ham ishlaydi', async () => {
  stubFetch(
    { statusCode: 400, message: ['Telefon raqami noto‘g‘ri', 'phone should not be empty'] },
    { status: 400 },
  )
  await assert.rejects(apiGet('/orders/x/track'), (error) => {
    assert.equal(error.message, 'Telefon raqami noto‘g‘ri', 'birinchisi ko‘rsatiladi')
    assert.equal(error.messages.length, 2, 'qolganlari yo‘qolmaydi')
    return true
  })
})

test('server matn bermasa — statusga qarab zaxira matn', async () => {
  stubFetch({ statusCode: 500 }, { status: 500 })
  await assert.rejects(apiGet('/products'), (error) => {
    assert.match(error.message, /Serverda xatolik/)
    assert.equal(error.isRetryable, true, '500 — qayta urinish ma’noga ega')
    return true
  })
})

test('tarmoq uzilsa — `ApiError`, `isNetwork`, qayta urinsa bo‘ladi', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new TypeError('Failed to fetch')
  }))
  await assert.rejects(apiGet('/products'), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.isNetwork, true)
    assert.equal(error.statusCode, 0)
    assert.equal(error.isRetryable, true)
    return true
  })
})

test('bekor qilish XATO EMAS — `AbortError` o‘zgarishsiz o‘tadi', async () => {
  // Sahifa almashganda so'rov bekor qilinadi; uni xato deb ko'rsatish
  // noto'g'ri bo'lardi, shuning uchun `ApiError` ga AYLANTIRILMAYDI.
  const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw abortError
  }))
  await assert.rejects(apiGet('/products'), (error) => {
    assert.equal(isAbortError(error), true)
    assert.ok(!(error instanceof ApiError))
    return true
  })
})

test('`X-Request-Id` javobdan olinadi — shikoyatda server logi topilsin', async () => {
  stubFetch({ data: null }, { headers: { 'X-Request-Id': 'abc-123' } })
  const { requestId } = await requestEnvelope('/products')
  assert.equal(requestId, 'abc-123')
})

test('204 va bo‘sh tana — `null`, JSON xatosi emas', async () => {
  stubFetch(undefined, { status: 204 })
  const { data } = await requestEnvelope('/products/x/view', { method: 'POST' })
  assert.equal(data, undefined)
})

test('toApiError — har qanday qiymatni `ApiError` ga keltiradi', () => {
  const original = new ApiError('bor')
  assert.equal(toApiError(original), original, 'bor bo‘lsa o‘zini qaytaradi')
  assert.ok(toApiError('satr') instanceof ApiError)
})

test('filtr → query: bo‘sh qiymatlar TASHLANADI', () => {
  // Aks holda `?search=&factoryId=` kabi bo'sh filtrlar serverga borardi.
  assert.equal(
    buildQuery({ page: 1, search: '', factoryId: null, surface: undefined, sizeId: 's1' }),
    'page=1&sizeId=s1',
  )
})

test('filtr → query: kalitlar SARALANADI (bitta kesh yozuvi)', () => {
  // `{a,b}` va `{b,a}` bir xil URL bersin — aks holda bir xil so'rov
  // keshda ikki marta yotardi.
  assert.equal(buildQuery({ b: 2, a: 1 }), buildQuery({ a: 1, b: 2 }))
})

test('filtr → query: massiv har bir qiymat uchun takrorlanadi', () => {
  assert.equal(buildQuery({ id: ['a', 'b'] }), 'id=a&id=b')
})

test('buildUrl — query bo‘lmasa `?` qo‘shilmaydi', () => {
  assert.ok(!buildUrl('/products').includes('?'))
  assert.ok(buildUrl('/products', { page: 2 }).endsWith('?page=2'))
})

test('buildUrl — yo‘l `/` bilan boshlanmasa ham to‘g‘ri yig‘iladi', () => {
  assert.equal(buildUrl('products'), buildUrl('/products'))
})
