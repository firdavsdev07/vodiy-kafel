import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
import { NotFoundException } from '@nestjs/common';
import {
  derivedFileUrl,
  type StorageDerivedInput,
  type StorageSaveInput,
  type StorageService,
  type StoredFile,
} from './storage.interface';

/** Bog'liq fayl qo'shimchasi va kengaytmasi — faqat shu belgilar. */
const DERIVED_PART = /^[a-z0-9]{1,16}$/;
/** Bog'liq fayl nomining asl o'zakdan keyingi qismi: `800w.webp`. */
const DERIVED_TAIL = /^[a-z0-9]{1,16}\.[a-z0-9]{1,16}$/;

/** Fayllar shu prefiks ostida beriladi (main.ts dagi static bilan bir xil). */
export const UPLOADS_URL_PREFIX = '/uploads';

/**
 * 🧪 Lokal disk (B-022). Production'da S3/VPS static bilan almashtiriladi.
 */
export class LocalDiskStorage implements StorageService {
  private readonly root: string;

  constructor(uploadDir: string) {
    this.root = resolve(uploadDir);
  }

  async save({
    buffer,
    folder,
    extension,
  }: StorageSaveInput): Promise<StoredFile> {
    const fileName = `${randomUUID()}.${extension}`;
    const dir = join(this.root, folder);

    await mkdir(dir, { recursive: true });
    // `wx` — mavjud faylni hech qachon ustidan yozmaydi.
    await writeFile(join(dir, fileName), buffer, { flag: 'wx' });

    return { url: `${UPLOADS_URL_PREFIX}/${folder}/${fileName}` };
  }

  async saveDerived({
    of,
    suffix,
    buffer,
    extension,
  }: StorageDerivedInput): Promise<StoredFile> {
    if (!DERIVED_PART.test(suffix) || !DERIVED_PART.test(extension)) {
      throw new Error(`Noto‘g‘ri qo‘shimcha: ${suffix}.${extension}`);
    }
    const url = derivedFileUrl(of, suffix, extension);
    const path = this.resolveOwnPath(url);
    if (!path) throw new NotFoundException('Asl fayl topilmadi');

    // Qayta yasalsa (eski rasmlar uchun skript) — ustidan yoziladi: nom
    // tasodifiy emas, asl fayldan kelib chiqadi.
    await writeFile(path, buffer);
    return { url };
  }

  async read(url: string): Promise<Buffer> {
    const path = this.resolveOwnPath(url);
    if (!path) throw new NotFoundException('Fayl topilmadi');

    try {
      return await readFile(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('Fayl topilmadi');
      }
      throw error;
    }
  }

  async delete(url: string): Promise<void> {
    const path = this.resolveOwnPath(url);
    if (!path) return;

    await unlinkQuietly(path);
    await Promise.all(
      (await this.derivedPaths(path)).map((p) => unlinkQuietly(p)),
    );
  }

  /**
   * Asl faylga bog'liq fayllar: `abc.jpg` → `abc-400w.webp`, `abc-800w.webp` …
   * Nom asl faylning TO'LIQ o'zagi + `-` bilan boshlanadi — o'zak tasodifiy
   * UUID, boshqa faylga tasodifan mos kelmaydi.
   */
  async derivedPaths(originalPath: string): Promise<string[]> {
    const stem = basename(originalPath, extname(originalPath));
    const dir = dirname(originalPath);
    let names: string[];
    try {
      names = await readdir(dir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const prefix = `${stem}-`;
    return names
      .filter(
        (n) =>
          n.startsWith(prefix) && DERIVED_TAIL.test(n.slice(prefix.length)),
      )
      .map((n) => join(dir, n));
  }

  /**
   * Manzil → disk yo'li, faqat u YUKLASH PAPKASI ICHIDA bo'lsa.
   *
   * 🔒 Bazadagi url qo'lda o'zgartirilgan bo'lishi mumkin
   *    (`/uploads/../../.env`). Papkadan tashqariga chiqadigan yoki tashqi
   *    havola (`https://...`) bo'lgan manzil o'chirilmaydi.
   */
  private resolveOwnPath(url: string): string | null {
    if (!url.startsWith(`${UPLOADS_URL_PREFIX}/`)) return null;

    const path = resolve(this.root, url.slice(UPLOADS_URL_PREFIX.length + 1));
    const rel = relative(this.root, path);
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;

    return path;
  }
}

async function unlinkQuietly(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
