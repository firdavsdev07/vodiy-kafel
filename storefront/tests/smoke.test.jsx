import { afterEach, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import assert from 'node:assert/strict'

import Gallery from '../src/pages/Gallery/Gallery.jsx'
import NotFound from '../src/pages/NotFound/NotFound.jsx'
import ProductDetail from '../src/pages/ProductDetail/ProductDetail.jsx'
import CollectionsSection from '../src/sections/home/CollectionsSection.jsx'
import { resetQueries } from '../src/shared/api/query-store.js'

/**
 * Sahifa renderi (S-041) — "smoke" testlar.
 *
 * Maqsad: sahifa yiqilmasdan chizilsinmi va API javobi ekranga
 * yetib borsinmi. Bu DIZAYN testi emas — joylashuv, rang va
 * animatsiya bu yerda tekshirilmaydi (jsdom da ular yo'q).
 *
 * ⚠ GSAP reveal'lari jsdom da ishlamaydi, lekin bu MUHIM EMAS:
 *   `useReveal` GSAP kelmasa elementni darhol yakuniy holatga
 *   o'tkazadi (FOUC qalqoni, S-018), ya'ni matn DOM'da baribir
 *   bo'ladi.
 */

afterEach(() => {
  cleanup()
  resetQueries()
  vi.unstubAllGlobals()
})

/**
 * Berilgan yo'llarga javob qaytaradigan soxta `fetch`.
 *
 * ⚠ Yo'l ANIQ solishtiriladi, `includes` bilan emas: `/products/x`
 *   naqshi `/products/x/similar` ga ham mos kelardi va sahifa
 *   "o'xshash mahsulotlar" o'rniga mahsulotning o'zini olib,
 *   `.map is not a function` bilan yiqilardi.
 */
function stubApi(routes) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const path = new URL(String(url)).pathname.replace(/^\/api\/v\d+/, '')
      const match = Object.entries(routes).find(([key]) => key === path)
      if (!match) {
        return {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          headers: { get: () => null },
          text: async () => JSON.stringify({ statusCode: 404, message: 'Topilmadi' }),
        }
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => null },
        text: async () => JSON.stringify({ data: match[1] }),
      }
    }),
  )
}

const draw = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

/**
 * `ProductDetail` `useParams()` dan `slug` oladi — ya'ni uni shunchaki
 * `MemoryRouter` ichiga qo'yish YETARLI EMAS: mos marshrut bo'lmasa
 * `slug` `undefined` bo'lib qoladi va sahifa abadiy skelet ko'rsatadi.
 */
const drawProduct = (slug) =>
  render(
    <MemoryRouter initialEntries={[`/catalog/${slug}`]}>
      <Routes>
        <Route path="/catalog/:slug" element={<ProductDetail />} />
      </Routes>
    </MemoryRouter>,
  )

test('NotFound — API chaqirmasdan ham chiziladi', () => {
  draw(<NotFound />)
  assert.ok(screen.getByRole('heading', { level: 1 }))
})

test('Galereya — API javobi ekranga chiqadi', async () => {
  stubApi({
    '/gallery': {
      items: [
        {
          id: 'g1',
          imageUrl: 'https://cdn/1.jpg',
          title: 'Farg‘onadagi loyiha',
          product: { id: 'p1', name: 'Lyuks Granit Bej', slug: 'lyuks-granit-bej' },
        },
        { id: 'g2', imageUrl: 'https://cdn/2.jpg', title: null, product: null },
      ],
      total: 2,
      page: 1,
      limit: 24,
      totalPages: 1,
    },
  })

  draw(<Gallery />)

  await waitFor(() => screen.getByText(/Farg‘onadagi loyiha/))
  // Bog'langan mahsulot — havola bo'ladi
  const link = screen.getByRole('link', { name: /Bajarilgan ish|Farg/ })
  assert.ok(link.getAttribute('href').includes('/catalog/lyuks-granit-bej'))
  // Bog'lanmagani — havolasiz, lekin yo'qolmaydi
  assert.ok(screen.getByText('Mahsulot ko‘rsatilmagan'))
})

test('Galereya — bo‘sh ro‘yxat "bo‘sh" holatini ko‘rsatadi', async () => {
  stubApi({ '/gallery': { items: [], total: 0, page: 1, limit: 24, totalPages: 0 } })
  draw(<Gallery />)
  await waitFor(() => screen.getByText(/hozircha bo‘sh/))
})

test('Galereya — xato holatida "qayta urinish" bor', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new TypeError('Failed to fetch')
  }))
  draw(<Gallery />)
  await waitFor(() => screen.getByRole('button', { name: /Qayta urinish/ }))
})

test('Mahsulot — 🔒 NARX ham, ZAXIRA SONI ham ekranda YO‘Q (G1)', async () => {
  stubApi({
    '/products/metro-vintage': {
      id: 'p1',
      name: 'Metro Vintage',
      slug: 'metro-vintage',
      factory: { id: 'f1', name: 'Metro Ceramics', slug: 'metro' },
      size: { id: 's1', label: '30x60', widthCm: 30, heightCm: 60 },
      surface: 'DEVOR',
      color: 'terrakota',
      sqmPerPallet: '1.08',
      weightPerPallet: '24',
      primaryImageUrl: 'https://cdn/1.jpg',
      availability: 'AVAILABLE',
      description: 'Metro Vintage — 30x60, devor uchun',
      media: [],
    },
    // Sahifa buni ham so'raydi — bo'sh ro'yxat normal holat.
    '/products/metro-vintage/similar': [],
  })

  const { container } = drawProduct('metro-vintage')
  await waitFor(() => screen.getByText('Metro Vintage'))

  assert.ok(screen.getByText('Omborda bor'), 'faqat "bor/yo‘q" ko‘rsatiladi')
  assert.ok(screen.getByText('1.08 m²'), 'o‘nlik son SATR holicha')

  const text = container.textContent
  assert.ok(!/so['‘]m/i.test(text), 'narx bo‘lmasligi kerak')
  assert.ok(!/\bpaddon:\s*\d+\b/i.test(text), 'zaxira soni bo‘lmasligi kerak')
})

test('Mahsulot — 404 bo‘lsa "topilmadi" sahifasi', async () => {
  stubApi({}) // hamma so'rov 404
  drawProduct('yoq-mahsulot')
  await waitFor(() => screen.getByText(/mavjud emas/i))
})

test('Bosh sahifa «Tanlangan kolleksiyalar» — API dan, eng ko‘p ko‘rilganlar (T-012)', async () => {
  stubApi({
    '/products': {
      items: [
        {
          id: 'p1',
          name: 'Metro Vintage',
          slug: 'metro-vintage',
          factory: { id: 'f1', name: 'Metro Ceramics', slug: 'metro' },
          size: { id: 's1', label: '30x60', widthCm: 30, heightCm: 60 },
          category: { id: 'c1', name: 'Keramogranit', slug: 'keramogranit' },
          surface: 'DEVOR',
          color: 'terrakota',
          primaryImageUrl: 'https://cdn/1.jpg',
          availability: 'AVAILABLE',
        },
      ],
      total: 1,
      page: 1,
      limit: 4,
      totalPages: 1,
    },
  })

  draw(<CollectionsSection />)

  await waitFor(() => screen.getByText('Metro Vintage'))
  assert.ok(screen.getByText('Metro Ceramics'))
  assert.ok(screen.getByText('Keramogranit'))
  const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]))
  assert.equal(url.searchParams.get('sortBy'), 'viewCount')
  assert.equal(url.searchParams.get('limit'), '4')
  for (const link of screen.getAllByRole('link', { name: 'Metro Vintage' })) {
    assert.equal(link.getAttribute('href'), '/catalog/metro-vintage')
  }
})

test('Bosh sahifa «Tanlangan kolleksiyalar» — bo‘sh katalogda bo‘lim chiqmaydi', async () => {
  stubApi({ '/products': { items: [], total: 0, page: 1, limit: 4, totalPages: 0 } })
  const { container } = draw(<CollectionsSection />)
  await waitFor(() => assert.equal(container.querySelector('section'), null))
})
