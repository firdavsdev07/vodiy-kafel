/**
 * Ommaviy narx o'zgarishi (D-017) — pul SATR ustida, BigInt tiyinlarda (G6):
 * `Number("85000.10") * 1.1` float xatosi beradi, bu yerda bermaydi.
 *
 * ⚠ G1 eslatma: backendda ommaviy endpoint YO'Q — yangi narx shu yerda
 * hisoblanadi va har mahsulotga alohida `PATCH .../price` ketadi. Hisob
 * faqat ko'rsatish va yuborish uchun; narxni backend baribir tekshiradi.
 */

export type BulkMode = 'set' | 'percent' | 'add';

const MONEY_RE = /^(\d+)(?:\.(\d{1,2}))?$/;
/** Foiz: -99.99 … +1000, verguldan keyin 2 tagacha */
const PERCENT_RE = /^([+-])?(\d{1,4})(?:\.(\d{1,2}))?$/;
const SIGNED_MONEY_RE = /^([+-])?(\d+)(?:\.(\d{1,2}))?$/;

function toCents(value: string): bigint | null {
  const m = MONEY_RE.exec(value.trim());
  if (!m) return null;
  return BigInt(m[1] ?? '0') * 100n + BigInt((m[2] ?? '').padEnd(2, '0') || '0');
}

export function centsToString(cents: bigint): string {
  const sign = cents < 0n ? '-' : '';
  const abs = cents < 0n ? -cents : cents;
  const int = abs / 100n;
  const frac = abs % 100n;
  return frac === 0n ? `${sign}${int}` : `${sign}${int}.${frac.toString().padStart(2, '0')}`;
}

/** Yarmidan yuqoriga yumaloqlash (0.5 tiyin → 1 tiyin), musbat son uchun. */
function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n);
}

export type BulkInputError = string | null;

/** Kiritilgan qiymat tekshiruvi — rejimga qarab. */
export function validateBulkInput(mode: BulkMode, raw: string): BulkInputError {
  const value = raw.trim().replace(',', '.');
  if (!value) return 'Qiymatni kiriting';
  if (mode === 'set') return toCents(value) && toCents(value)! > 0n ? null : 'Musbat summa kiriting (tiyin — 2 xonagacha)';
  if (mode === 'add') {
    const m = SIGNED_MONEY_RE.exec(value);
    return m && value.replace(/[+-]/, '') !== '0' && !/^0+(\.0+)?$/.test(value.replace(/[+-]/, ''))
      ? null
      : 'Summa kiriting: +5000 yoki -2000';
  }
  const m = PERCENT_RE.exec(value);
  if (!m) return 'Foiz kiriting: 10 yoki -5,5';
  const bp = percentToBasisPoints(value)!;
  if (bp === 0n) return 'Foiz 0 bo‘lmasin';
  if (bp <= -10000n) return 'Kamaytirish 100% dan kichik bo‘lsin';
  if (bp > 1_000_00n) return 'Oshirish 1000% dan oshmasin';
  return null;
}

function percentToBasisPoints(value: string): bigint | null {
  const m = PERCENT_RE.exec(value.trim().replace(',', '.'));
  if (!m) return null;
  const abs = BigInt(m[2] ?? '0') * 100n + BigInt((m[3] ?? '').padEnd(2, '0') || '0');
  return m[1] === '-' ? -abs : abs;
}

export type BulkResult = { ok: true; price: string } | { ok: false; reason: string };

/**
 * Bitta narx uchun yangi qiymat. `raw` — `validateBulkInput` dan o'tgan.
 * Natija ≤ 0 bo'lsa — xato (bu mahsulot o'zgartirilmaydi).
 */
export function applyBulk(oldPrice: string, mode: BulkMode, raw: string): BulkResult {
  const value = raw.trim().replace(',', '.');
  const old = toCents(oldPrice);
  if (old === null) return { ok: false, reason: 'Joriy narx o‘qilmadi' };
  let next: bigint;
  if (mode === 'set') {
    next = toCents(value) ?? 0n;
  } else if (mode === 'add') {
    const m = SIGNED_MONEY_RE.exec(value);
    const delta = toCents(`${m?.[2] ?? '0'}${m?.[3] ? `.${m[3]}` : ''}`) ?? 0n;
    next = m?.[1] === '-' ? old - delta : old + delta;
  } else {
    const bp = percentToBasisPoints(value) ?? 0n;
    next = divRoundHalfUp(old * (10000n + bp), 10000n);
  }
  if (next <= 0n) return { ok: false, reason: 'Yangi narx 0 yoki manfiy bo‘lib qoladi' };
  return { ok: true, price: centsToString(next) };
}
