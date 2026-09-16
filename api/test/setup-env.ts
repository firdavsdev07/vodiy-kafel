/**
 * Har bir e2e test faylidan OLDIN ishga tushadi (jest `setupFiles`) —
 * `.env.test` ni process.env ga yuklaydi, shunda AppModule shu bazaga
 * ulanadi, dev `.env` ga tegilmaydi.
 *
 * dotenv mavjud `process.env` qiymatini EZMAYDI, shuning uchun CI'da
 * o'zgaruvchilar boshqacha berilsa ham (masalan Docker orqali) bu fayl
 * ularni bosib ketmaydi.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../.env.test') });
