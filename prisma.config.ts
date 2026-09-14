import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI konfiguratsiyasi (migrate, generate, studio uchun).
 *
 * Prisma 7 dan boshlab ulanish manzili schema.prisma da emas, shu yerda.
 * Prisma 7 `.env` ni avtomatik o'qimaydi — shuning uchun `dotenv/config`.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
