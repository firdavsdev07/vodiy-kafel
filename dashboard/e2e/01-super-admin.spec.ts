import { expect, test, type Page } from '@playwright/test';
import { ACCOUNTS, login, openMenu, unique } from './helpers';

/**
 * SUPER_ADMIN asosiy oqimlari (D-046: 1–7, 11). Bitta sahifa, bitta kirish —
 * ssenariylar ketma-ket bir-biriga tayanadi (masalan 5 da yaratilgan buyurtma
 * 6 va 7 da ishlatiladi).
 */
test.describe.configure({ mode: 'serial' });

let page: Page;
const suffix = unique();
let orderUrl = '';
let orderNumber = '';

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});
test.afterAll(async () => {
  await page.close();
});

test('1. SUPER_ADMIN kiradi → bosh sahifa ochiladi', async () => {
  await login(page, ACCOUNTS.superAdmin);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Xush kelibsiz/ })).toBeVisible();
  await expect(page.getByText('Bosh administrator').first()).toBeVisible();
  // Ko'rsatkich kartochkasi backend sonini ko'rsatadi
  await expect(page.getByRole('link', { name: /Yangi buyurtmalar/ })).toBeVisible();
});

test('2. Mahsulot yaratadi → ro‘yxatda ko‘rinadi', async () => {
  const name = `E2E Granit ${suffix}`;
  await openMenu(page, 'Mahsulotlar');
  await page.getByRole('link', { name: 'Yangi mahsulot' }).click();
  await expect(page).toHaveURL(/\/products\/new$/);
  const form = page.locator('main form');
  await form.getByLabel('Nomi').fill(name);
  await form.getByLabel('Zavod').selectOption({ index: 1 });
  await form.getByLabel('O‘lcham').selectOption({ index: 1 });
  await form.getByLabel('Sirt').selectOption({ index: 1 });
  await form.getByLabel('1 paddondagi m²').fill('1,44');
  await form.getByLabel('1 paddon og‘irligi').fill('32,5');
  await form.getByRole('button', { name: 'Mahsulotni qo‘shish' }).click();
  await expect(page).toHaveURL(/\/products\/[^/]+$/);

  await openMenu(page, 'Mahsulotlar');
  await page.getByRole('searchbox').fill(name);
  await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible();
});

test('3. Filial narxini o‘zgartiradi → saqlanadi', async () => {
  // Har yurishda boshqa narx — aks holda "o'zgarmagan" deb saqlanmaydi
  const price = String(90_000 + (Date.now() % 9_000));
  const shown = new RegExp(`${price.slice(0, 2)}\\s${price.slice(2)}`);
  await openMenu(page, 'Narxlar');
  await page.getByRole('button', { name: /narxni o‘zgartirish/ }).first().click();
  const input = page.getByRole('textbox', { name: /yangi narx/ });
  const productName = (await input.getAttribute('aria-label'))?.split(' — ')[0] ?? '';
  await input.fill(price);
  await page.getByRole('button', { name: 'Saqlash' }).click();
  // Toast: "<mahsulot>: eski → yangi (m²)"; pul guruhi ingichka bo'shliq (U+202F) — `\s` qamraydi
  await expect(page.getByText(new RegExp(`${escape(productName)}: .*→ ${shown.source}`))).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: productName }).filter({ hasText: shown }).first()).toBeVisible();
});

test('4. Optom mijoz yaratadi → vaqtinchalik parol BIR MARTA ko‘rsatiladi', async () => {
  const customerLogin = `e2e-${suffix}`;
  await openMenu(page, 'Optom mijozlar');
  await page.getByRole('button', { name: 'Yangi mijoz' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Kompaniya').fill(`E2E Qurilish ${suffix}`);
  await dialog.getByLabel('Login').fill(customerLogin);
  await dialog.getByLabel('Mas’ul shaxs').fill('E2E Sinov');
  await dialog.getByLabel('Telefon').fill('90 555 12 34');
  await dialog.getByLabel('Filial').selectOption({ index: 1 });
  await dialog.getByRole('button', { name: 'Hisob ochish' }).click();

  const passwordDialog = page.getByRole('dialog', { name: /vaqtinchalik parol/ });
  await expect(passwordDialog).toBeVisible();
  const password = (await passwordDialog.getByLabel(/^Parol:/).getAttribute('aria-label'))?.replace('Parol: ', '').replace(/ /g, '') ?? '';
  expect(password.length).toBeGreaterThanOrEqual(8);

  // "Saqladim" belgisisiz yopilmaydi: sarlavhadagi ✕ ham, pastdagi "Yopish" ham o'chiq; Esc ham ishlamaydi
  const closeButtons = passwordDialog.getByRole('button', { name: 'Yopish', exact: true });
  await expect(closeButtons).toHaveCount(2);
  await expect(closeButtons.first()).toBeDisabled();
  await expect(closeButtons.last()).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(passwordDialog).toBeVisible();
  await passwordDialog.getByLabel(/Parolni saqladim/).check();
  await closeButtons.last().click();
  await expect(passwordDialog).toBeHidden();

  // Parol boshqa hech qayerda qolmadi — sahifada ham, brauzer xotirasida ham
  await expect(page.getByText(password)).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + location.href);
  expect(stored).not.toContain(password);
});

test('5. Qo‘lda buyurtma kiritadi → summa backenddan keladi', async () => {
  await openMenu(page, 'Buyurtmalar');
  await page.getByRole('link', { name: 'Yangi buyurtma' }).click();
  await page.getByPlaceholder(/Kompaniya, login, telefon yoki INN/).fill('Farg');
  await page.getByRole('listitem').filter({ hasText: 'fargona-optom' }).getByRole('button', { name: 'Tanlash' }).click();
  await page.getByPlaceholder(/Mahsulot qidiring/).fill('Crown Premium');
  await page.getByRole('listitem').filter({ hasText: 'Crown Premium Pol' }).getByRole('button').first().click();
  await page.getByRole('button', { name: 'Buyurtma yaratish' }).click();

  await expect(page).toHaveURL(/\/orders\/[^/]+$/);
  orderUrl = new URL(page.url()).pathname;
  orderNumber = (await page.locator('header h2 .font-mono').first().textContent())?.trim() ?? '';
  expect(orderNumber).toMatch(/^VK-\d{4}-\d{6}$/);
  await expect(page.getByText(/yaratildi — jami \d/)).toBeVisible();
  // Summa — backend hisobi (forma hech qanday summa yubormagan)
  await expect(page.locator('header').getByText(/\d[\d\s ]* so‘m/)).toBeVisible();
});

test('6. Buyurtma holatini o‘zgartiradi → faqat ruxsat etilgan tugmalar', async () => {
  expect(orderUrl).not.toBe('');
  const actions = page.getByRole('region', { name: 'Buyurtma amallari' });
  // Olib ketish yo'li: NEW → LOADING yoki bekor qilish; mashina qidirish tugmasi YO'Q
  await expect(actions.getByRole('button', { name: 'Yuklashni boshlash' })).toBeVisible();
  await expect(actions.getByRole('button', { name: 'Buyurtmani bekor qilish' })).toBeVisible();
  await expect(actions.getByRole('button', { name: 'Mashina qidirishni boshlash' })).toHaveCount(0);

  await actions.getByRole('button', { name: 'Yuklashni boshlash' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tasdiqlash' }).click();
  await expect(actions.getByRole('button', { name: 'Yetkazildi deb belgilash' })).toBeVisible();
  await expect(actions.getByRole('button', { name: 'Yuklashni boshlash' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Holat tarixi' }).locator('..')).toContainText('Yuklanmoqda');
});

test('7. To‘lovni tasdiqlaydi → balans yangilanadi', async () => {
  const paymentCard = page.getByRole('heading', { name: 'To‘lov' }).locator('..');
  await paymentCard.getByRole('button', { name: 'Tasdiqlash' }).click();
  const dialog = page.getByRole('dialog', { name: /To‘lov tushganini tasdiqlaysizmi/ });
  await dialog.getByRole('button', { name: 'Tasdiqlash' }).click();
  await expect(paymentCard.getByText('To‘landi')).toBeVisible();

  // Mijoz hisobida to'lov yozuvi paydo bo'ldi
  await page.getByRole('link', { name: 'Farg‘ona Qurilish MChJ' }).or(page.getByRole('link', { name: "Farg'ona Qurilish MChJ" })).click();
  await page.getByRole('link', { name: 'Hisob' }).click();
  // Aynan SHU buyurtma bo'yicha to'lov yozuvi (seed'dagi eski yozuvlar hisobga olinmaydi)
  await expect(page.getByRole('row').filter({ hasText: orderNumber }).filter({ hasText: 'To‘lov' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: orderNumber }).filter({ hasText: 'Qarz' })).toBeVisible();
});

test('11. Token eskirganda avtomatik yangilanadi, ish uzilmaydi', async () => {
  await openMenu(page, 'Buyurtmalar');
  // Keshda yo'q so'rov ("Tezkor" filtri) birinchi marta 401 oladi — access token "eskirgan".
  // Klient BITTA refresh qilib so'rovni qayta yuborishi, sahifa esa ishlashda davom etishi kerak.
  let forced = false;
  await page.route('**/api/v1/admin/orders?**isUrgent=true**', async (route) => {
    if (forced) return route.fallback();
    forced = true;
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 401, error: 'Unauthorized', message: 'Token eskirgan', path: '/admin/orders', timestamp: new Date().toISOString(), requestId: 'e2e' }),
    });
  });
  const refresh = page.waitForRequest('**/api/v1/auth/refresh');
  await page.getByRole('button', { name: 'Tezkor', exact: true }).click();
  await refresh;
  expect(forced).toBe(true);
  await expect(page).toHaveURL(/\/orders\?.*isUrgent=true/);
  await expect(page.getByRole('table', { name: 'Buyurtmalar' })).toBeVisible();
  await expect(page.getByText('Sessiya tugadi')).toHaveCount(0);
  await page.unroute('**/api/v1/admin/orders?**isUrgent=true**');
});

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
