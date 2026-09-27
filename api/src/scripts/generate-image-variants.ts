/**
 * Eski rasmlar uchun `srcset` variantlarini yasaydi (T-014).
 *
 * T-014 dan oldin yuklangan rasmlarda 400 / 800 / 1600 px webp nusxalar
 * yo'q, javob esa ularning manzilini baribir beradi — sayt 404 oladi.
 * Shu skript bazadagi har bir rasmni aylanib chiqib, yetishmayotgan
 * variantlarni yasaydi. Qayta ishga tushirish xavfsiz: bor variant
 * tegilmaydi (`--force` — hammasini qayta yasash).
 *
 * Ishga tushirish:  pnpm images:variants [--force]
 *
 * ⚠ Deploy'dan keyin BIR MARTA ishga tushirilsin. Yangi yuklangan rasmlar
 *   uchun kerak emas — ular yuklash paytida yasaladi (`ImageStorageService`).
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma';
import {
  IMAGE_VARIANT_EXTENSION,
  IMAGE_VARIANT_WIDTHS,
  imageVariants,
  renderImageVariants,
  STORAGE_SERVICE,
  type StorageService,
  variantSuffix,
} from '../storage';

async function imageUrls(prisma: PrismaService): Promise<string[]> {
  const [media, gallery, categories, branches, partners] = await Promise.all([
    prisma.productMedia.findMany({
      where: { type: { in: ['IMAGE', 'IMAGE_360'] } },
      select: { url: true },
    }),
    prisma.galleryItem.findMany({ select: { imageUrl: true } }),
    prisma.category.findMany({
      where: { coverImageUrl: { not: null } },
      select: { coverImageUrl: true },
    }),
    prisma.branch.findMany({
      where: { buildingImageUrl: { not: null } },
      select: { buildingImageUrl: true },
    }),
    prisma.partner.findMany({ select: { logoUrl: true } }),
  ]);
  return [
    ...media.map((r) => r.url),
    ...gallery.map((r) => r.imageUrl),
    ...categories.map((r) => r.coverImageUrl),
    ...branches.map((r) => r.buildingImageUrl),
    ...partners.map((r) => r.logoUrl),
  ].filter((url): url is string => Boolean(url));
}

async function exists(storage: StorageService, url: string): Promise<boolean> {
  try {
    await storage.read(url);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const prisma = app.get(PrismaService);
  const storage = app.get<StorageService>(STORAGE_SERVICE);

  const urls = [...new Set(await imageUrls(prisma))];
  const stats = { made: 0, skipped: 0, external: 0, failed: 0 };

  for (const url of urls) {
    const variants = imageVariants(url);
    if (!variants) {
      stats.external += 1; // tashqi havola yoki bizniki bo'lmagan nom
      continue;
    }
    if (!force && (await exists(storage, variants.w1600))) {
      stats.skipped += 1;
      continue;
    }
    try {
      const rendered = await renderImageVariants(await storage.read(url));
      for (const { width, buffer } of rendered) {
        await storage.saveDerived({
          of: url,
          suffix: variantSuffix(width),
          extension: IMAGE_VARIANT_EXTENSION,
          buffer,
        });
      }
      stats.made += 1;
    } catch (error) {
      stats.failed += 1;
      console.warn(
        `⚠ ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(
    `✅ Rasmlar: ${urls.length} ta — yasaldi ${stats.made}, bor edi ` +
      `${stats.skipped}, variantsiz (tashqi) ${stats.external}, xato ` +
      `${stats.failed}. Kengliklar: ${IMAGE_VARIANT_WIDTHS.join(' / ')} px.`,
  );
  await app.close();
  if (stats.failed > 0) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error('❌ Variantlarni yasab bo‘lmadi:', error);
  process.exit(1);
});
