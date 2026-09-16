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

  /** `save` qaytargan manzil bo'yicha o'chiradi. Fayl yo'q bo'lsa — xato emas. */
  delete(url: string): Promise<void>;
}

export interface StorageSaveInput {
  buffer: Buffer;
  /** Mantiqiy guruh: `products`, `branches`, `partners`. */
  folder: StorageFolder;
  /** Tekshirilgan kengaytma (nuqtasiz) — foydalanuvchi yuborgan nomdan EMAS. */
  extension: string;
}

export interface StoredFile {
  /** Bazaga yoziladigan va frontendga beriladigan manzil. */
  url: string;
}

export type StorageFolder = 'products' | 'branches' | 'partners' | 'gallery';

/** DI tokeni — `@Inject(STORAGE_SERVICE) storage: StorageService`. */
export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
