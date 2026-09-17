/**
 * Klaviatura yordamchilari (D-044) — DOM'ga bog'liq bo'lmagan sof qism
 * testlanadi, hodisa ulash komponentda.
 */

/** Foydalanuvchi matn yozayaptimi — global qisqa tugmalar (`/`) bu paytda ishlamaydi. */
export function isTypingTarget(target: EventTarget | null): boolean {
  // Minimal shakl bilan tekshiriladi — testda DOM (jsdom) shart emas
  const el = target as { tagName?: unknown; type?: unknown; isContentEditable?: unknown } | null;
  if (!el || typeof el.tagName !== 'string') return false;
  if (el.isContentEditable === true) return true;
  const tag = el.tagName.toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  const type = typeof el.type === 'string' ? el.type : 'text';
  return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'].includes(type);
}

/** Ro'yxatda o'q bilan yurish: joriy indeks → keyingi (chegarada to'xtaydi). */
export function nextIndex(key: string, current: number, length: number): number | null {
  if (length === 0) return null;
  switch (key) {
    case 'ArrowDown':
      return Math.min(current + 1, length - 1);
    case 'ArrowUp':
      return Math.max(current - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return length - 1;
    default:
      return null;
  }
}
