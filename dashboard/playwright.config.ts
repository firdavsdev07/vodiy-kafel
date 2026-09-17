import { defineConfig, devices } from '@playwright/test';

const API_PORT = 3001;
const WEB_PORT = 5175;

/**
 * E2E (D-046) — haqiqiy backendga qarshi, alohida `vodiy-kafel-test` bazasida
 * (dev bazaga tegilmaydi). Seed hisoblari `api/prisma/seed.ts` bilan bir xil.
 *
 * ⚠ Backend auth controller'i daqiqasiga 10 so'rov bilan cheklangan (B-049) —
 *   testlar ketma-ket (workers: 1), har rol bir marta kiradi va sahifalar
 *   orasida menyu orqali yuriladi (qayta yuklash refresh so'rovi yuboradi).
 *
 * Ishga tushirish: `pnpm e2e` (bir marta: `docker exec vk-postgres createdb -U postgres vodiy-kafel-test`,
 * `pnpm exec playwright install chromium`).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    // Topilmagan element — 3 daqiqa emas, tez yiqilsin
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    locale: 'uz-UZ',
    timezoneId: 'Asia/Tashkent',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: 'node e2e/start-api.mjs',
      url: `http://localhost:${API_PORT}/api/v1/regions`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
    {
      command: `pnpm exec vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_URL: `http://localhost:${API_PORT}/api/v1` },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
