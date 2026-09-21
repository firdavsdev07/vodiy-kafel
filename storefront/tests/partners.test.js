import { test } from 'vitest'
import assert from 'node:assert/strict'

import { partnerModel } from '../src/shared/api/partners.js'

/**
 * `partners.js` (S-026). Kichik model, lekin ikki joyi sinadi:
 * nisbiy manzil to'ldirilishi va sayti yo'q hamkor.
 */

test('partnerModel — nisbiy logotip manzili to‘liq bo‘ladi', () => {
  const partner = partnerModel({
    id: 'p1',
    name: 'Knauf',
    logoUrl: '/uploads/partners/0b6f1c1e.png',
    websiteUrl: 'https://knauf.uz',
  })

  assert.equal(partner.name, 'Knauf')
  assert.ok(partner.logo.startsWith('http'))
  assert.ok(partner.logo.endsWith('/uploads/partners/0b6f1c1e.png'))
  assert.equal(partner.websiteUrl, 'https://knauf.uz')
})

test('partnerModel — tashqi manzil TEGILMAYDI', () => {
  const partner = partnerModel({
    id: 'p2',
    name: 'Belissimo',
    logoUrl: 'https://cdn.vodiykafel.uz/pt/2.png',
    websiteUrl: null,
  })

  assert.equal(partner.logo, 'https://cdn.vodiykafel.uz/pt/2.png')
})

test('partnerModel — sayti yo‘q hamkor `null` bo‘ladi, bo‘sh satr emas', () => {
  // `PartnerLogo` shu `null` ga qarab havola o'rniga oddiy blok chizadi —
  // bo'sh satr `href=""` bo'lib sahifaning o'ziga havola yasardi.
  assert.equal(partnerModel({ id: 'p3', name: 'Ansor', logoUrl: '/x.png', websiteUrl: '' }).websiteUrl, null)
  assert.equal(partnerModel({ id: 'p4', name: 'Ansor', logoUrl: '/x.png' }).websiteUrl, null)
})

test('partnerModel — logotipsiz hamkor yiqilmaydi', () => {
  // Nom har doim bor, ya'ni `PartnerLogo` uni matn qilib ko'rsatadi.
  const partner = partnerModel({ id: 'p5', name: 'Yuksalish Group', logoUrl: null, websiteUrl: null })
  assert.equal(partner.logo, '')
  assert.equal(partner.name, 'Yuksalish Group')
})
