/**
 * Jest `globalSetup` (B-047) — barcha e2e testlardan OLDIN, BIR MARTA
 * ishga tushadi:
 *   1. `.env.test` dagi bazaga migratsiyalarni qo'llaydi
 *   2. `prisma/seed.ts` bilan bir xil, tanish ma'lumotlarni to'ldiradi
 *      (filiallar, mahsulotlar, mijozlar — login/parol oldindan ma'lum)
 *
 * Shunga ko'ra e2e testlar `pnpm test:e2e` bilan bitta buyruqda,
 * qo'lda tayyorlovsiz ishlaydi. Dev bazasiga (`.env`) TEGILMAYDI —
 * alohida `vodiy-kafel-test` bazasida ishlaydi.
 */
import { execFileSync } from 'node:child_process';
import { config } from 'dotenv';
import { resolve } from 'node:path';

export default function globalSetup(): void {
  const envPath = resolve(__dirname, '../.env.test');
  const parsed = config({ path: envPath }).parsed ?? {};
  const cwd = resolve(__dirname, '..');
  const env = { ...process.env, ...parsed };

  if (!env.DATABASE_URL?.includes('vodiy-kafel-test')) {
    throw new Error(
      'global-setup: DATABASE_URL "vodiy-kafel-test" ga ishora qilmayapti — ' +
        'xato bazani migratsiya/seed qilib qo‘yishdan saqlanish uchun to‘xtatildi.',
    );
  }

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd,
    env,
    stdio: 'inherit',
  });

  execFileSync(
    'npx',
    ['ts-node', '-P', 'tsconfig.seed.json', 'prisma/seed.ts'],
    { cwd, env, stdio: 'inherit' },
  );
}
