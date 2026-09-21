import { test } from 'vitest'
import assert from 'node:assert/strict'

import { branchModel, formatPhone, mapLink } from '../src/shared/api/branches.js'

/**
 * `branches.js` — saytning manzil manbai (S-025). Telefon va xarita
 * havolasi bu yerda yasaladi, ya'ni xato bo'lsa odam noto'g'ri joyga
 * boradi yoki raqamni terolmaydi. Shuning uchun chegara holatlari.
 */

const FARGONA = {
  id: 'b1',
  name: "Vodiy Kafel — Farg'ona",
  city: "Farg'ona",
  address: 'Mustaqillik 12',
  latitude: 40.3864,
  longitude: 71.7864,
  workingHours: 'Du–Sh 09:00–18:00, Yakshanba dam',
  phones: ['+998730000010'],
  buildingImageUrl: null,
  telegramUrl: 'https://t.me/vodiykafel',
  instagramUrl: 'https://instagram.com/vodiykafel',
}

test('formatPhone — o‘zbek raqami o‘qish uchun ajratiladi', () => {
  assert.equal(formatPhone('+998730000010'), '+998 73 000 00 10')
  // Bo'shliqli yoki qavsli kelsa ham natija bir xil.
  assert.equal(formatPhone('998 73 000 00 10'), '+998 73 000 00 10')
})

test('formatPhone — notanish format TEGILMAYDI', () => {
  // Noto'g'ri "chiroyli" ko'rinish raqamni buzardi — bori ko'rsatiladi.
  assert.equal(formatPhone('+7 495 000 00 00'), '+7 495 000 00 00')
  assert.equal(formatPhone('12345'), '12345')
  assert.equal(formatPhone(null), '')
})

test('mapLink — koordinatadan havola, noto‘g‘ri qiymatda null', () => {
  assert.equal(
    mapLink(40.3864, 71.7864),
    'https://www.google.com/maps/search/?api=1&query=40.3864,71.7864',
  )
  // Koordinata yo'q — havola ham bo'lmaydi (sahifa uni chizmaydi).
  assert.equal(mapLink(null, 71.7864), null)
  assert.equal(mapLink(undefined, undefined), null)
})

test('branchModel — ekran va `tel:` uchun ikki xil telefon', () => {
  const branch = branchModel(FARGONA)
  assert.deepEqual(branch.phones, [{ display: '+998 73 000 00 10', href: '+998730000010' }])
})

test('branchModel — hamma maydon joyida', () => {
  const branch = branchModel(FARGONA)
  assert.equal(branch.city, "Farg'ona")
  assert.equal(branch.address, 'Mustaqillik 12')
  assert.equal(branch.workingHours, 'Du–Sh 09:00–18:00, Yakshanba dam')
  assert.equal(branch.coordinates, '40.3864 / 71.7864')
  assert.ok(branch.mapUrl.includes('40.3864,71.7864'))
  // Seed'da bino surati yo'q — bo'sh satr, `SmartImage` o'z zaxirasini oladi.
  assert.equal(branch.image, '')
})

test('branchModel — telefonsiz do‘kon sahifani yiqitmaydi', () => {
  const branch = branchModel({ ...FARGONA, phones: undefined, latitude: null, longitude: null })
  assert.deepEqual(branch.phones, [])
  assert.equal(branch.mapUrl, null)
  assert.equal(branch.coordinates, null)
})
