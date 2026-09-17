import { expect, test, type Page } from '@playwright/test';
import { ACCOUNTS, login, openMenu, SEED_PASSWORD } from './helpers';

/**
 * 🔒 Filial rollari (D-046: 8–10). Rol UI'ni bekitadi, lekin himoya backendda
 * (G4) — shuning uchun URL orqali kirish ham tekshiriladi.
 */
test.describe.configure({ mode: 'serial' });

let page: Page;

test.beforeAll(async ({ browser }) => {
  // Oldingi fayl auth so'rovlarini sarflagan — backend cheklovi (10/daqiqa) tiklansin
  await new Promise((resolve) => setTimeout(resolve, 61_000));
  page = await browser.newPage();
});
test.afterAll(async () => {
  await page.close();
});

test('8. 🔒 BRANCH_ADMIN kiradi → "Moderatorlar" yo‘q', async () => {
  await login(page, ACCOUNTS.branchAdmin);
  const menu = page.getByRole('navigation', { name: 'Asosiy menyu' });
  await expect(menu.getByRole('link', { name: 'Xodimlar', exact: true })).toBeVisible();
  await openMenu(page, 'Xodimlar');
  await expect(page.getByRole('tab', { name: 'Moderatorlar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Yangi menejer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yangi moderator' })).toHaveCount(0);
});

test('9. 🔒 BRANCH_ADMIN begona filial resursini URL orqali ochadi → "topilmadi"', async ({ request }) => {
  // Narx uchun alohida URL yo'q — begona (Andijon) filial mijozining kartasi ishlatiladi.
  // ID ni SUPER_ADMIN sifatida API'dan olamiz (UI'da filial admini uni ko'ra olmaydi).
  const api = 'http://localhost:3001/api/v1';
  const auth = await request.post(`${api}/auth/admin/login`, { data: { phone: `+998${ACCOUNTS.superAdmin}`, password: SEED_PASSWORD } });
  const token = ((await auth.json()) as { data: { accessToken: string } }).data.accessToken;
  const list = await request.get(`${api}/admin/customers?search=andijon-optom`, { headers: { authorization: `Bearer ${token}` } });
  const foreignId = ((await list.json()) as { data: { items: { id: string }[] } }).data.items[0]?.id;
  expect(foreignId).toBeTruthy();

  await page.goto(`/customers/${foreignId}`);
  await expect(page.getByText(/Topilmadi/)).toBeVisible();
  // Mavjudligi oshkor qilinmaydi — "ruxsat yo'q" DEYILMAYDI
  await expect(page.getByText(/ruxsat/i)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Andijon/ })).toHaveCount(0);
});

test('10. 🔒 MANAGER zaxira sahifasini ochadi → maydonlar disabled', async ({ browser }) => {
  const managerPage = await browser.newPage();
  await login(managerPage, ACCOUNTS.manager);
  await openMenu(managerPage, 'Zaxira');
  const inputs = managerPage.getByRole('textbox', { name: /ombordagi paddonlar soni/ });
  await expect(inputs.first()).toBeVisible();
  const count = await inputs.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) await expect(inputs.nth(i)).toBeDisabled();
  await expect(managerPage.getByRole('button', { name: 'Saqlash' })).toHaveCount(0);
  await managerPage.close();
});
