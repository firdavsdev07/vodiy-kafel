// E2E backend (D-046): test bazasini migratsiya + seed qiladi va API ni 3001-portda ishga tushiradi.
// 🔒 Faqat `vodiy-kafel-test` bazasi — dev bazasini (vodiy-kafel) tasodifan tozalab qo'ymaslik uchun.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const api = resolve(import.meta.dirname, '../../api');
const env = {
  ...process.env,
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/vodiy-kafel-test?schema=public',
  PORT: process.env.E2E_API_PORT ?? '3001',
  NODE_ENV: 'development',
  CORS_ORIGINS: '*',
  UPLOAD_DIR: resolve(import.meta.dirname, '../node_modules/.e2e-uploads'),
};
if (!env.DATABASE_URL.includes('vodiy-kafel-test')) {
  throw new Error('E2E: DATABASE_URL "vodiy-kafel-test" ga ishora qilmayapti — to‘xtatildi');
}
mkdirSync(env.UPLOAD_DIR, { recursive: true });

const run = (cmd, args) => execFileSync(cmd, args, { cwd: api, env, stdio: 'inherit' });
run('pnpm', ['exec', 'prisma', 'migrate', 'deploy']);
run('pnpm', ['db:seed']);
run('pnpm', ['build']);

const server = spawn('node', ['dist/main'], { cwd: api, env, stdio: 'inherit' });
const stop = () => server.kill('SIGTERM');
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
server.on('exit', (code) => process.exit(code ?? 0));
