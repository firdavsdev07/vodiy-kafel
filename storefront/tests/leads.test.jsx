import { afterEach, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import assert from 'node:assert/strict'

import ContactForm from '../src/pages/Contact/ContactForm.jsx'
import { submitLead, validateLead } from '../src/shared/api/leads.js'
import { resetQueries } from '../src/shared/api/query-store.js'

/** Aloqa formasi — `POST /leads` (T-013). */

afterEach(() => {
  cleanup()
  resetQueries()
  vi.unstubAllGlobals()
})

/** `fetch` taqlidi: `/branches` — ro'yxat, `/leads` — javob; POST tanalari yig'iladi. */
function stubApi({ lead = { status: 201, body: { data: { reference: 'VK-7H2K9Q' } } } } = {}) {
  const posts = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init = {}) => {
      const path = new URL(String(url)).pathname.replace(/^\/api\/v\d+/, '')
      const reply = (status, body) => ({
        ok: status < 400,
        status,
        statusText: '',
        headers: { get: () => null },
        text: async () => JSON.stringify(body),
      })
      if (path === '/branches') {
        return reply(200, {
          data: [
            { id: 'b1', name: 'Farg‘ona', city: 'Farg‘ona', phones: [] },
            { id: 'b2', name: 'Andijon', city: 'Andijon', phones: [] },
          ],
        })
      }
      if (path === '/leads' && init.method === 'POST') {
        posts.push(JSON.parse(init.body))
        return reply(lead.status, lead.body)
      }
      return reply(404, { statusCode: 404, message: 'Topilmadi' })
    }),
  )
  return posts
}

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

test('validateLead — backend qoidalari bilan bir xil', () => {
  assert.deepEqual(validateLead({ name: 'Aziz', phone: '+998 90 123-45-67', message: 'Salom' }), {})
  assert.deepEqual(Object.keys(validateLead({ name: ' A ', phone: '12345', message: '  ' })).sort(), [
    'message',
    'name',
    'phone',
  ])
  assert.ok(validateLead({ name: 'Aziz', phone: '90 abc 45 67 89', message: 'x' }).phone)
})

test('submitLead — bo‘sh do‘kon va bo‘sh tuzoq yuborilmaydi, matn tozalanadi', async () => {
  const posts = stubApi()
  const result = await submitLead({ name: ' Aziz ', phone: ' 901234567 ', message: ' Salom ', branchId: '', website: '' })
  assert.deepEqual(posts[0], { name: 'Aziz', phone: '901234567', message: 'Salom' })
  assert.equal(result.reference, 'VK-7H2K9Q')
})

test('Forma — yuborilgach ma’lumotnoma chiqadi, tanlangan do‘kon ketadi', async () => {
  const posts = stubApi()
  render(<ContactForm />)

  await screen.findByLabelText('Qaysi do‘kon yaqinroq')
  fill('Ism', 'Aziz')
  fill('Telefon', '+998 90 123 45 67')
  fill('Qaysi do‘kon yaqinroq', 'b2')
  fill('Xabar', 'Hammomga 20 m² kerak')
  fireEvent.click(screen.getByRole('button', { name: 'Yuborish' }))

  await screen.findByText('Qabul qilindi.')
  assert.ok(screen.getByText('Ma’lumotnoma: VK-7H2K9Q'))
  assert.deepEqual(posts, [
    { name: 'Aziz', phone: '+998 90 123 45 67', message: 'Hammomga 20 m² kerak', branchId: 'b2' },
  ])
})

test('Forma — xato maydon bo‘lsa so‘rov ketmaydi', async () => {
  const posts = stubApi()
  render(<ContactForm />)

  fill('Ism', 'A')
  fireEvent.click(screen.getByRole('button', { name: 'Yuborish' }))

  assert.ok(screen.getByText('Ismingizni kiriting'))
  assert.ok(screen.getByText('Telefon raqamini to‘liq kiriting'))
  assert.equal(posts.length, 0)
})

test('Forma — server rad etsa (429) uning matni ko‘rinadi, forma saqlanadi', async () => {
  stubApi({
    lead: {
      status: 429,
      body: { statusCode: 429, message: 'Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.' },
    },
  })
  render(<ContactForm />)

  fill('Ism', 'Aziz')
  fill('Telefon', '901234567')
  fill('Xabar', 'Salom')
  fireEvent.click(screen.getByRole('button', { name: 'Yuborish' }))

  const alert = await screen.findByRole('alert')
  assert.match(alert.textContent, /Juda ko‘p urinish/)
  await waitFor(() => assert.equal(screen.getByLabelText('Ism').value, 'Aziz'))
})
