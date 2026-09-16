/**
 * Telefonni backenddagi ko'rinishga keltiradi: `+998901234567`.
 * Qabul qiladi: "90 123 45 67", "+998 (90) 123-45-67", "998901234567".
 * Noto'g'ri bo'lsa `null` — forma xabar ko'rsatadi, so'rov ketmaydi.
 */
export function normalizeUzPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('998') ? digits.slice(3) : digits;
  return /^\d{9}$/.test(local) ? `+998${local}` : null;
}
