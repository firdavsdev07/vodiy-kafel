/** Mijozga ko'rinadigan buyurtma raqami: `VK-2026-000123`. */
export const formatOrderNumber = (year: number, sequence: number): string =>
  `VK-${year}-${String(sequence).padStart(6, '0')}`;
