import { expect, type Page } from '@playwright/test';

/** Seed hisoblari (api/prisma/seed.ts) — parol hammasida bir xil. */
export const SEED_PASSWORD = 'Parol123!';
export const ACCOUNTS = {
  superAdmin: '900000001',
  moderator: '900000002',
  branchAdmin: '900110001',
  manager: '900220001',
} as const;

/**
 * UI orqali kirish. Backend auth'ni daqiqasiga 10 so'rov bilan cheklaydi —
 * "Juda ko'p so'rov" chiqsa bir daqiqa kutib qayta uriniladi.
 */
export async function login(page: Page, phone: string) {
  await page.goto('/login');
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByLabel('Telefon raqami').fill(phone);
    await page.getByLabel('Parol', { exact: true }).fill(SEED_PASSWORD);
    await page.getByRole('button', { name: 'Kirish' }).click();
    const outcome = await Promise.race([
      page.getByRole('navigation', { name: 'Asosiy menyu' }).waitFor().then(() => 'ok' as const),
      page.getByText(/Juda ko‘p/).waitFor().then(() => 'throttled' as const),
    ]);
    if (outcome === 'ok') return;
    await page.waitForTimeout(61_000);
  }
  throw new Error('Kirib bo‘lmadi (auth cheklovi)');
}

/** Sahifani qayta yuklamasdan menyu orqali o'tish (auth so'rovlari tejaladi). */
export async function openMenu(page: Page, title: string) {
  const link = page.getByRole('navigation', { name: 'Asosiy menyu' }).getByRole('link', { name: title, exact: true });
  const heading = page.getByRole('heading', { level: 1, name: title, exact: true });
  // Oldingi sahifa (lazy chunk) hali chizilayotgan bo'lsa bosish yutilib ketishi mumkin — qayta uriniladi
  await expect(async () => {
    await link.click();
    await expect(heading).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
}

export const unique = () => Date.now().toString(36);
