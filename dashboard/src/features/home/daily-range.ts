/**
 * Kunlik chart davri (T-010) — sof funksiyalar.
 *
 * ⚠ Hamma vaqt TOSHKENT bo'yicha (UTC+5, yoz/qish o'tishi yo'q) — backend
 *   kunlarni ham shu bo'yicha ajratadi. Brauzer boshqa mintaqada bo'lsa
 *   ham "25-sentabr" ikkala tomonda bir xil kun bo'lsin.
 */
const OFFSET_MS = 5 * 60 * 60 * 1000;
const OFFSET = '+05:00';

export interface DayRange {
  /** `YYYY-MM-DD` */
  fromDate: string;
  /** `HH:MM` */
  fromTime: string;
  toDate: string;
  toTime: string;
}

export type QuickRangeId = '3d' | '7d' | '15d' | '1m' | '3m' | '6m' | '12m';

export const QUICK_RANGES: readonly { id: QuickRangeId; label: string; days?: number; months?: number }[] = [
  { id: '3d', label: '3 kunlik', days: 3 },
  { id: '7d', label: '7 kunlik', days: 7 },
  { id: '15d', label: '15 kunlik', days: 15 },
  { id: '1m', label: '1 oylik', months: 1 },
  { id: '3m', label: '3 oylik', months: 3 },
  { id: '6m', label: '6 oylik', months: 6 },
  { id: '12m', label: '12 oylik', months: 12 },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** UTC lahza → Toshkent sanasi va soati (input qiymatlari). */
export function tashkentParts(at: Date): { date: string; time: string } {
  const local = new Date(at.getTime() + OFFSET_MS);
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  };
}

/** Input qiymatlari (Toshkent vaqti) → ISO 8601 — backendga shunday ketadi. */
export function toIso(date: string, time: string): string {
  return `${date}T${time || '00:00'}:00${OFFSET}`;
}

/**
 * Tezkor davr: hozirdan ORQAGA. Kunlik — aniq N × 24 soat; oylik —
 * kalendar oyi (25-sentabr → 25-avgust). Oy oxiri: 31-mart − 1 oy →
 * 28/29-fevral (kun yo'q bo'lsa — oyning oxirgi kuni).
 */
export function quickRange(id: QuickRangeId, now: Date): DayRange {
  const spec = QUICK_RANGES.find((r) => r.id === id)!;
  const to = tashkentParts(now);
  let from: Date;
  if (spec.days) {
    from = new Date(now.getTime() - spec.days * 24 * 60 * 60 * 1000);
  } else {
    const local = new Date(now.getTime() + OFFSET_MS);
    const y = local.getUTCFullYear();
    const m = local.getUTCMonth() - (spec.months ?? 0);
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const shifted = Date.UTC(
      y,
      m,
      Math.min(local.getUTCDate(), lastDay),
      local.getUTCHours(),
      local.getUTCMinutes(),
    );
    from = new Date(shifted - OFFSET_MS);
  }
  const f = tashkentParts(from);
  return { fromDate: f.date, fromTime: f.time, toDate: to.date, toTime: to.time };
}

/** Davr to'g'rimi — backendga yuborishdan oldin (xabar bilan). */
export function rangeError(range: DayRange): string | null {
  if (!range.fromDate || !range.toDate) return 'Sanalarni tanlang';
  const from = Date.parse(toIso(range.fromDate, range.fromTime));
  const to = Date.parse(toIso(range.toDate, range.toTime));
  if (Number.isNaN(from) || Number.isNaN(to)) return 'Sana noto‘g‘ri';
  if (from >= to) return 'Boshlanish vaqti tugash vaqtidan oldin bo‘lishi kerak';
  if (to - from > 370 * 24 * 60 * 60 * 1000) return 'Davr 12 oydan oshmasin';
  return null;
}

const MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];
const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

const parseDay = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return { y: y!, m: m!, d: d!, weekday: new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay() };
};

/** `2026-09-25` → "25-sentabr 2026, juma" — tooltip uchun. */
export function formatDayLong(date: string): string {
  const { y, m, d, weekday } = parseDay(date);
  return `${d}-${MONTHS[m - 1]} ${y}, ${WEEKDAYS[weekday]}`;
}

/** `2026-09-25` → "25-sen" — o'q yozuvi uchun. */
export function formatDayShort(date: string): string {
  const { m, d } = parseDay(date);
  return `${d}-${MONTHS[m - 1]!.slice(0, 3)}`;
}

/** Davr sarlavhasi: "18-sentabr 2026, 09:00 → 25-sentabr 2026, 18:00". */
export function formatPeriod(range: DayRange): string {
  const part = (date: string, time: string) => {
    const { y, m, d } = parseDay(date);
    return `${d}-${MONTHS[m - 1]} ${y}, ${time || '00:00'}`;
  };
  return `${part(range.fromDate, range.fromTime)} → ${part(range.toDate, range.toTime)}`;
}
