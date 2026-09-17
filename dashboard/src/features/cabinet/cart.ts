/**
 * Savat — BRAUZERDA (D-053). Backendda savat jadvali YO'Q: mijoz
 * tanlagan qatorlar `localStorage` da turadi, summa esa har o'zgarishda
 * `POST /calculator/quote` dan so'raladi.
 *
 * ⚠ O'LCHOV BIRLIGI — PADDON, kv.m EMAS (TZ 3.3, `QuoteItemDto.pallets`).
 *
 * ⚠ NARX SAQLANMAYDI: qatorda faqat `productId` va `pallets`. Katalogda
 *   ko'rilgan narx savatga ko'chirilsa, u eskirib qolardi va mijoz
 *   buyurtma bergach boshqa summa chiqardi. Narxning yagona manbasi —
 *   backend (CLAUDE.md qoida 1).
 *
 * Bu fayl SOF: `localStorage` ga o'zi tegmaydi (u — `cart-store.ts`),
 * shuning uchun qoidalari testda to'g'ridan-to'g'ri tekshiriladi.
 */

/** Savat qatori — API `QuoteItemDto` ga aynan mos keladigan ikki maydon + ko'rsatish uchun nom. */
export interface CartLine {
  productId: string;
  /** Mahsulot sahifasiga havola uchun. */
  slug: string;
  /** Faqat ko'rsatish uchun — narx emas, u eskirmaydi. */
  name: string;
  pallets: number;
}

/** Backend `QuoteRequestDto.items` — `@ArrayMaxSize(50)`. */
export const MAX_CART_LINES = 50;
/** Backend `QuoteItemDto.pallets` — `@Max(100000)`. */
export const MAX_PALLETS = 100_000;
export const MIN_PALLETS = 1;

export const CART_STORAGE_KEY = 'vk-cabinet-cart';

export type CartError = 'lines' | 'pallets';

function isLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.productId === 'string' &&
    line.productId !== '' &&
    typeof line.slug === 'string' &&
    typeof line.name === 'string' &&
    typeof line.pallets === 'number' &&
    Number.isInteger(line.pallets) &&
    line.pallets >= MIN_PALLETS &&
    line.pallets <= MAX_PALLETS
  );
}

/**
 * `localStorage` dagi satr → savat.
 *
 * ⚠ Har bir qator ALOHIDA tekshiriladi va yaroqsizi tashlanadi: saqlangan
 *   ma'lumot eski versiyadan qolgan yoki qo'lda buzilgan bo'lishi mumkin.
 *   Butun savatni tashlash mijozning ishini bekorga yo'qotardi.
 */
export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const lines = parsed.filter(isLine).map((line) => ({
      productId: line.productId,
      slug: line.slug,
      name: line.name,
      pallets: line.pallets,
    }));
    // Bir mahsulot ikki marta yozilgan bo'lsa — birinchisi qoladi
    const seen = new Set<string>();
    return lines
      .filter((line) => !seen.has(line.productId) && seen.add(line.productId))
      .slice(0, MAX_CART_LINES);
  } catch {
    return [];
  }
}

export function clampPallets(pallets: number): number {
  if (!Number.isFinite(pallets)) return MIN_PALLETS;
  return Math.min(MAX_PALLETS, Math.max(MIN_PALLETS, Math.trunc(pallets)));
}

/**
 * Qator qo'shish. Mahsulot savatda bo'lsa — paddon QO'SHILADI (mijoz
 * katalogdan yana bir marta bosdi, ya'ni ko'proq xohlaydi), yangi qator
 * yaratilmaydi.
 *
 * Savat to'lgan bo'lsa (50 qator) — xato qaytadi, jimgina tashlanmaydi.
 */
export function addLine(
  lines: readonly CartLine[],
  line: Omit<CartLine, 'pallets'> & { pallets?: number },
): { lines: CartLine[]; error?: CartError } {
  const pallets = clampPallets(line.pallets ?? MIN_PALLETS);
  const existing = lines.find((item) => item.productId === line.productId);

  if (existing) {
    const next = existing.pallets + pallets;
    return {
      lines: lines.map((item) =>
        item.productId === line.productId ? { ...item, pallets: clampPallets(next) } : item,
      ),
      ...(next > MAX_PALLETS ? { error: 'pallets' as const } : {}),
    };
  }

  if (lines.length >= MAX_CART_LINES) return { lines: [...lines], error: 'lines' };
  return {
    lines: [...lines, { productId: line.productId, slug: line.slug, name: line.name, pallets }],
  };
}

export function setPallets(
  lines: readonly CartLine[],
  productId: string,
  pallets: number,
): CartLine[] {
  return lines.map((line) =>
    line.productId === productId ? { ...line, pallets: clampPallets(pallets) } : line,
  );
}

export function removeLine(lines: readonly CartLine[], productId: string): CartLine[] {
  return lines.filter((line) => line.productId !== productId);
}

export function totalPallets(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.pallets, 0);
}

/** Savat → `QuoteRequestDto.items` / `CreateOrderDto.items`. */
export function toQuoteItems(
  lines: readonly CartLine[],
): { productId: string; pallets: number }[] {
  return lines.map((line) => ({ productId: line.productId, pallets: line.pallets }));
}

export const cartErrorText: Record<CartError, string> = {
  lines: `Savatga ko‘pi bilan ${MAX_CART_LINES} xil mahsulot sig‘adi`,
  pallets: 'Bitta qatorda ko‘pi bilan 100 000 paddon',
};
