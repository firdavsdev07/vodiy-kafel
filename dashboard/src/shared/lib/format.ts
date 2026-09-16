/**
 * Formatlashning YAGONA joyi (D-008): pul (G6) va vaqt (G9). Komponentda
 * `toLocaleString()` / `Number(price)` YOZILMAYDI — `MoneyText`, `DateText`
 * yoki shu funksiyalar.
 */

export const TIME_ZONE = 'Asia/Tashkent';
export const CURRENCY = 'so‘m';

/** Minglar ajratgichi — tor bo'shliq (U+202F): raqam qatorda uzilib ketmaydi. */
const GROUP = ' ';

const DECIMAL_RE = /^(-)?(\d+)(?:\.(\d+))?$/;

/**
 * API puli `"85000.00"` → `"85 000"`, `"85000.50"` → `"85 000,50"`.
 * ⚠ G6: satr ustida ishlaydi, `Number()` ga AYLANTIRILMAYDI — katta summa
 * float xatosiga uchramaydi. Noto'g'ri satr → o'zi qaytadi (yashirilmaydi).
 */
export function formatMoney(value: string, options: { currency?: boolean } = {}): string {
  const match = DECIMAL_RE.exec(value.trim());
  if (!match) return value;
  const [, sign = '', int = '0', frac = ''] = match;
  const grouped = int.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
  const cents = frac.replace(/0+$/, '');
  const text = `${sign ? '−' : ''}${grouped}${cents ? `,${cents.padEnd(2, '0')}` : ''}`;
  return options.currency === false ? text : `${text} ${CURRENCY}`;
}

const dateParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export type DateFormat = 'date' | 'datetime' | 'time';

/**
 * UTC ISO satr → Toshkent vaqti (G9): `17.09.2026 14:05`. Brauzer tili va
 * soat mintaqasiga bog'liq EMAS — hamma xodimda bir xil ko'rinadi.
 * Noto'g'ri sana → `—`.
 */
export function formatDate(value: string | Date, format: DateFormat = 'datetime'): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const p = Object.fromEntries(dateParts.formatToParts(date).map((x) => [x.type, x.value]));
  const day = `${p.day}.${p.month}.${p.year}`;
  const time = `${p.hour}:${p.minute}`;
  return format === 'date' ? day : format === 'time' ? time : `${day} ${time}`;
}

/**
 * Pul inputi: foydalanuvchi yozgani → API satri. "85 000,5" → "85000.5".
 * Vergul ham nuqta ham qabul qilinadi; ortiqcha belgilar tashlanadi;
 * verguldan keyin `scale` tagacha raqam.
 */
export function parseMoneyInput(input: string, scale = 2): string {
  const cleaned = input.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const [int = '', ...rest] = cleaned.split('.');
  const normalizedInt = int.replace(/^0+(?=\d)/, '');
  if (rest.length === 0) return normalizedInt;
  return `${normalizedInt || '0'}.${rest.join('').slice(0, scale)}`;
}

/** API satri → input ko'rinishi (guruhlangan, valyutasiz). Yozish davomida "85000." ham saqlanadi. */
export function formatMoneyInput(value: string): string {
  if (!value) return '';
  const [int = '', frac] = value.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return frac === undefined ? grouped : `${grouped},${frac}`;
}

/**
 * O'nlik satrni solishtirish uchun: `"43.2000"` → `"43.2"`, `"007"` → `"7"`.
 * API `Decimal(10,4)` ni to'ldirilgan nollar bilan qaytaradi, forma esa
 * foydalanuvchi yozganini — "o'zgardimi?" shu orqali tekshiriladi.
 */
export function normalizeDecimal(value: string): string {
  const [int = '', frac = ''] = value.trim().split('.');
  const i = int.replace(/^0+(?=\d)/, '');
  const f = frac.replace(/0+$/, '');
  return f ? `${i || '0'}.${f}` : i || '0';
}

/** `+998901234567` → `+998 90 123 45 67`. Boshqa ko'rinish — o'zgarmaydi. */
export function formatUzPhone(phone: string): string {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone.trim());
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

/** Mijoz balansi (G6): musbat — qarz, manfiy — avans, 0 — hisob-kitob yo'q. */
export function balanceKind(balance: string): 'debt' | 'advance' | 'zero' {
  const v = balance.trim();
  if (/^-/.test(v)) return /^-0*(\.0*)?$/.test(v) ? 'zero' : 'advance';
  return /^0*(\.0*)?$/.test(v) ? 'zero' : 'debt';
}
