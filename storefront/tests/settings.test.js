import { test } from 'vitest'
import assert from 'node:assert/strict'

import { findSetting } from '../src/shared/api/settings.js'

/** S-028 — sozlamalar modeli, chegara holatlari bilan. */

test('findSetting — kalit bor, yo‘q va bo‘sh ro‘yxat', () => {
  const settings = [{ key: 'payment.requisites', value: { bank: 'Hamkorbank' } }]
  assert.deepEqual(findSetting(settings, 'payment.requisites'), { bank: 'Hamkorbank' })
  assert.equal(findSetting(settings, 'stock.lowThresholdPallets'), undefined)
  assert.equal(findSetting(undefined, 'payment.requisites'), undefined)
})
