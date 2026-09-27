/**
 * Fayl saqlash — interfeys ortida (CLAUDE.md qoida 3, B-022).
 *
 * Biznes-servis faylning QAYERDA turishini bilmaydi: bugun lokal disk,
 * ertaga S3 yoki VPS static — faqat yangi implementatsiya yoziladi.
 */
export interface StorageService {
  /**
   * Faylni saqlaydi va unga ochiq manzil qaytaradi.
   *
   * ⚠ Fayl nomini chaqiruvchi BERMAYDI — implementatsiya o'zi tasodifiy
   *   nom yasaydi. Foydalanuvchi bergan nom yo'lga tushsa, `../` orqali
   *   papkadan chiqib ketish yoki boshqa faylni ustidan yozish mumkin.
   */
  save(file: StorageSaveInput): Promise<StoredFile>;

  /**
   * Asl faylga BOG'LIQ fayl — masalan rasmning kichraytirilgan nusxasi
   * (T-014). Nomi asl fayldan: [[derivedFileUrl]]. `delete(of)` asl fayl
   * bilan birga bularni ham o'chiradi.
   *
   * `suffix` — faqat kichik harf va raqam (kod ichidagi doimiy, foydalanuvchi
   * kiritmaydi); boshqasi rad etiladi.
   */
  saveDerived(file: StorageDerivedInput): Promise<StoredFile>;

  /**
   * `save` qaytargan manzil bo'yicha o'chiradi — unga bog'liq fayllar
   * (`saveDerived`) bilan birga. Fayl yo'q bo'lsa — xato emas.
   */
  delete(url: string): Promise<void>;

  /**
   * `save` qaytargan manzil bo'yicha o'qiydi (B-045 — shartnoma PDF'ini
   * autentifikatsiya bilan berish uchun; ochiq `/uploads/...` orqali EMAS).
   * Fayl topilmasa xato tashlaydi.
   */
  read(url: string): Promise<Buffer>;
}

export interface StorageSaveInput {
  buffer: Buffer;
  /** Mantiqiy guruh: `products`, `branches`, `partners`. */
  folder: StorageFolder;
  /** Tekshirilgan kengaytma (nuqtasiz) — foydalanuvchi yuborgan nomdan EMAS. */
  extension: string;
}

export interface StorageDerivedInput {
  /** Asl fayl manzili (`save` qaytargan). */
  of: string;
  /** Nom qo'shimchasi: `800w` → `<asl-nom>-800w.<ext>`. */
  suffix: string;
  buffer: Buffer;
  extension: string;
}

/**
 * Asl faylga bog'liq fayl manzili: `/uploads/p/abc.jpg` + `800w` + `webp`
 * → `/uploads/p/abc-800w.webp`.
 *
 * ⚠ Bu nomlash — SHARTNOMA: saqlovchi (`saveDerived`) ham, javobdagi
 *   manzilni yasovchi (`imageVariants`) ham shu funksiyadan o'tadi. Ikkalasi
 *   ajralib ketsa, sayt mavjud bo'lmagan faylni so'raydi.
 */
export function derivedFileUrl(
  url: string,
  suffix: string,
  extension: string,
): string {
  return url.replace(/\.[a-z0-9]+$/i, '') + `-${suffix}.${extension}`;
}

export interface StoredFile {
  /** Bazaga yoziladigan va frontendga beriladigan manzil. */
  url: string;
}

export type StorageFolder =
  | 'products'
  | 'branches'
  | 'partners'
  | 'categories'
  | 'gallery'
  | 'contracts'
  /** T-009: mijozlarga yuborilgan xabar rasmlari */
  | 'announcements';

/** DI tokeni — `@Inject(STORAGE_SERVICE) storage: StorageService`. */
export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
