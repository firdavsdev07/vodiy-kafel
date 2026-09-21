import { test } from 'vitest'
import assert from 'node:assert/strict'

import {
  breadcrumbSchema,
  gallerySchema,
  organizationSchema,
  productSchema,
} from '../src/lib/schema.js'

/** S-039 — Schema.org obyektlari. Asosiy xavf: narx sizib chiqishi. */

const PRODUCT = {
  id: 'p1',
  name: 'Metro Vintage',
  slug: 'metro-vintage',
  description: 'Metro Vintage — 30x60, devor uchun',
  color: 'terrakota',
  availability: 'AVAILABLE',
  factory: { name: 'Metro Ceramics' },
  size: { label: '30x60' },
}

test('productSchema — 🔒 NARX YO‘Q (G1)', () => {
  const schema = productSchema(PRODUCT)
  const json = JSON.stringify(schema)
  assert.ok(!json.includes('price'), 'ochiq saytda narx bo‘lmasligi kerak')
  assert.ok(!json.includes('Currency'), 'valyuta ham berilmaydi')
  assert.equal(schema.offers.availability, 'https://schema.org/InStock')
})

test('productSchema — omborda yo‘q mahsulot', () => {
  const schema = productSchema({ ...PRODUCT, availability: 'UNAVAILABLE' })
  assert.equal(schema.offers.availability, 'https://schema.org/OutOfStock')
})

test('productSchema — brend va o‘lcham', () => {
  const schema = productSchema(PRODUCT)
  assert.equal(schema.brand.name, 'Metro Ceramics')
  assert.equal(schema.size, '30x60')
  assert.equal(schema['@type'], 'Product')
})

test('productSchema — bo‘sh maydonlar UMUMAN chiqmaydi', () => {
  // `undefined` qiymat `JSON.stringify` da tushib qoladi — `color: null`
  // kabi bo‘sh maydon chiqsa Google uni xato deb o‘qiydi.
  const schema = productSchema({ ...PRODUCT, color: null, description: null })
  const json = JSON.stringify(schema)
  assert.ok(!json.includes('"color"'))
  assert.ok(!json.includes('"description"'))
})

test('breadcrumbSchema — tartib raqami 1 dan boshlanadi', () => {
  const schema = breadcrumbSchema([
    { name: 'Bosh sahifa', path: '/' },
    { name: 'Katalog', path: '/catalog' },
  ])
  assert.deepEqual(schema.itemListElement.map((i) => i.position), [1, 2])
  assert.ok(schema.itemListElement[1].item.endsWith('/catalog'))
})

test('gallerySchema — rasmsiz yozuv tashlanadi', () => {
  const schema = gallerySchema([
    { image: 'https://cdn/1.jpg', title: 'Loyiha' },
    { image: '', title: 'Rasmsiz' },
  ])
  assert.equal(schema.image.length, 1)
  assert.equal(schema.image[0].contentUrl, 'https://cdn/1.jpg')
})

test('organizationSchema — filialsiz ham yiqilmaydi', () => {
  const company = {
    name: 'Vodiy Kafel',
    legalName: 'Vodiy Kafel Savdo Markazi',
    intro: 'Tavsif',
    contact: {
      phoneHref: ['998911296666'],
      email: 'a@b.uz',
      telegram: 'https://t.me/x',
      instagram: 'https://instagram.com/x',
    },
  }
  const schema = organizationSchema({ company, branches: [] })
  assert.equal(schema['@type'], 'LocalBusiness')
  assert.equal(schema.address, undefined, 'filial yo‘q — manzil ham yo‘q')
  assert.deepEqual(schema.telephone, ['+998911296666'])
})

test('organizationSchema — birinchi filial asosiy, qolgani bo‘lim', () => {
  const company = {
    name: 'Vodiy Kafel',
    legalName: 'X',
    intro: '',
    contact: { phoneHref: [], email: '', telegram: null, instagram: null },
  }
  const branches = [
    { city: "Farg'ona", address: 'Mustaqillik 12', workingHours: 'Du–Sh 09:00–18:00', phones: [] },
    { city: 'Andijon', address: 'Bobur shoh 45', workingHours: 'Du–Sh', phones: [{ href: '+998740000010' }] },
  ]
  const schema = organizationSchema({ company, branches })
  assert.equal(schema.address.addressLocality, "Farg'ona")
  assert.equal(schema.department.length, 1)
  assert.equal(schema.department[0].address.addressLocality, 'Andijon')
})
