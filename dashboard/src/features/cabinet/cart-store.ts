import { useSyncExternalStore } from 'react';
import { toast } from '@/shared/ui';
import {
  addLine,
  cartErrorText,
  CART_STORAGE_KEY,
  parseCart,
  removeLine,
  setPallets,
  type CartLine,
} from './cart';

/**
 * Savat do'koni (D-053) — `localStorage` + `useSyncExternalStore`.
 *
 * ⚠ Nega TanStack Query emas: savat SERVER holati emas, backendda u
 *   umuman yo'q. Query bilan yuritish "so'rovsiz so'rov" bo'lardi.
 *
 * ⚠ `storage` hodisasi ham eshitiladi: mijoz ikki yorliqda ishlashi
 *   mumkin, ikkinchisida qo'shgani birinchisida ham ko'rinadi.
 */
function createCartStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null) {
  let lines: CartLine[] = read();
  const listeners = new Set<() => void>();

  function read(): CartLine[] {
    try {
      return parseCart(storage?.getItem(CART_STORAGE_KEY) ?? null);
    } catch {
      return []; // private rejim — savat xotirada ishlaydi
    }
  }

  function write(next: CartLine[]) {
    lines = next;
    try {
      storage?.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Saqlanmasa ham joriy sahifada ishlaydi
    }
    listeners.forEach((listener) => listener());
  }

  return {
    getLines: () => lines,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Boshqa yorliqda o'zgargan savatni qabul qilish. */
    sync() {
      write(read());
    },
    add(line: Omit<CartLine, 'pallets'> & { pallets?: number }) {
      const result = addLine(lines, line);
      write(result.lines);
      return result.error;
    },
    setPallets(productId: string, pallets: number) {
      write(setPallets(lines, productId, pallets));
    },
    remove(productId: string) {
      write(removeLine(lines, productId));
    },
    clear() {
      write([]);
    },
  };
}

function browserStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const cartStore = createCartStore(browserStorage());

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === CART_STORAGE_KEY) cartStore.sync();
  });
}

const EMPTY: CartLine[] = [];

/** Savat qatorlari — o'zgarganda komponent qayta chiziladi. */
export function useCart(): CartLine[] {
  return useSyncExternalStore(cartStore.subscribe, cartStore.getLines, () => EMPTY);
}

/**
 * Savatga qo'shish — chegara buzilsa toast bilan aytadi (jim tashlamaydi).
 * Muvaffaqiyatda `true` qaytadi.
 */
export function addToCart(line: Omit<CartLine, 'pallets'> & { pallets?: number }): boolean {
  const error = cartStore.add(line);
  if (error) {
    toast.info(cartErrorText[error]);
    return error === 'pallets'; // paddon chegarasi — qator baribir qo'shildi
  }
  return true;
}
