import type { ReactNode } from 'react';

/**
 * Faqat ikonkali tugma (jadval qatoridagi amallar). `label` — ekran o'quvchi
 * va sichqoncha ustida ko'rinadigan matn: ikonka yolg'iz ma'no bermaydi.
 */
export function IconButton({
  label,
  onClick,
  disabled,
  inactive = false,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /**
   * Amal mumkin emas, lekin SABABI ko'rinsin: tugma fokuslanadi va bosiladi
   * (`onClick` sababni aytadi), xira ko'rinadi. `disabled` da esa na fokus,
   * na tooltip bor.
   */
  inactive?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      aria-disabled={inactive || undefined}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-md text-muted disabled:cursor-not-allowed disabled:opacity-40 ${
        inactive
          ? 'cursor-not-allowed opacity-40'
          : danger
            ? 'hover:bg-danger-soft hover:text-danger'
            : 'hover:bg-surface-muted hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}
