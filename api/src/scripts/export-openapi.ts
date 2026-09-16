/**
 * openapi.json faylini yaratadi — serverni ishga tushirmasdan.
 *
 * Frontend jamoasi shu fayldan TypeScript turlarini generatsiya qila oladi:
 *   npx openapi-typescript openapi.json -o src/api-types.ts
 *
 * Ishga tushirish:  pnpm openapi:export
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { API_PREFIX } from '../common';
import { buildOpenApiDocument } from '../swagger';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(API_PREFIX);
  await app.init();

  const document = buildOpenApiDocument(app);
  const output = resolve(process.cwd(), 'openapi.json');
  writeFileSync(output, JSON.stringify(document, null, 2), 'utf-8');

  const routes = Object.keys(document.paths ?? {}).length;
  console.log(`✅ openapi.json yozildi — ${routes} ta yo‘l`);

  await app.close();
}

void main().catch((error: unknown) => {
  console.error('❌ Eksport muvaffaqiyatsiz:', error);
  process.exit(1);
});
