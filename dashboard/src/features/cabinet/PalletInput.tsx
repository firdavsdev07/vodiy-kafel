import { useState } from 'react';
import { MAX_PALLETS, MIN_PALLETS, normalizePalletDraft } from './cart';

/**
 * Paddon soni maydoni (T-002).
 *
 * ⚠ Nega oddiy `value={number}` emas: maydon tozalanganda `Number('')`
 *   0 bo'lib qaytib yozilardi, keyin "5" terilsa — "05" chiqardi
 *   (mahsulot sahifasi). Savatda esa qiymat darhol 1 ga chegaralanib,
 *   "5" terilsa "15" bo'lardi. Shuning uchun matn (`draft`) alohida
 *   saqlanadi va tashqariga FAQAT to'g'ri son chiqadi; maydondan
 *   chiqilganda (blur) qiymat chegaraga keltiriladi.
 *
 * `max` — odatda `MAX_PALLETS`, lekin ombordagi mavjud miqdor bilan
 * toraytirilishi mumkin (T-005).
 */
export function PalletInput({
  value,
  onChange,
  min = MIN_PALLETS,
  max = MAX_PALLETS,
  id,
  className,
  'aria-label': ariaLabel,
  disabled,
}: {
  value: number;
  onChange: (pallets: number) => void;
  min?: number;
  max?: number;
  id?: string;
  className?: string;
  'aria-label'?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  // Tashqi qiymat o'zgarsa (+/− tugmasi, boshqa yorliq) — matn ham yangilanadi.
  // Effekt emas, render paytidagi moslashtirish: bitta ortiqcha kadr bo'lmaydi.
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(String(value));
  }

  const commit = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      disabled={disabled}
      value={draft}
      onChange={(event) => {
        const next = normalizePalletDraft(event.target.value);
        setDraft(next);
        const n = Number(next);
        // Chegarada bo'lsa — darhol; bo'sh yoki chegaradan tashqari — blur'da
        if (next !== '' && n >= min && n <= max && n !== value) onChange(n);
      }}
      onBlur={() => {
        if (draft === '') return setDraft(String(value));
        commit(Number(draft));
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && draft !== '') commit(Number(draft));
      }}
      className={className}
    />
  );
}
