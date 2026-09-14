import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import type {
  StorageSaveInput,
  StorageService,
  StoredFile,
} from './storage.interface';

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

  async delete(url: string): Promise<void> {
    const path = this.resolveOwnPath(url);
    if (!path) return;

    try {
      await unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
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
