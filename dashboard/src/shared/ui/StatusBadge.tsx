import { orderStatusLabel, paymentStatusLabel, stockStatusLabel } from '@/shared/lib/labels';
import {
  orderStatusTone,
  paymentStatusTone,
  stockStatusTone,
  toneClasses,
  type OrderStatus,
  type PaymentStatus,
  type StockStatus,
  type Tone,
} from '@/shared/lib/status-tone';

const kinds = {
  order: { tone: orderStatusTone, label: orderStatusLabel },
  payment: { tone: paymentStatusTone, label: paymentStatusLabel },
  stock: { tone: stockStatusTone, label: stockStatusLabel },
} as const;

interface ValueOf {
  order: OrderStatus;
  payment: PaymentStatus;
  stock: StockStatus;
}

export type StatusKind = keyof ValueOf;

type Props = { [K in StatusKind]: { kind: K; value: ValueOf[K] } }[StatusKind];

/**
 * Enum → rang + o'zbekcha matn (D-008, G7). Rang yagona signal emas — matn
 * doim bor. Noma'lum qiymat (backend yangilangan, frontend hali yo'q) —
 * neytral rangda xom qiymat bilan: yashirilmaydi.
 */
export function StatusBadge(props: Props) {
  const kind = kinds[props.kind] as {
    tone: Record<string, Tone>;
    label: Record<string, string>;
  };
  return <Badge tone={kind.tone[props.value] ?? 'neutral'}>{kind.label[props.value] ?? props.value}</Badge>;
}

/** Holatsiz yorliq (masalan "Faol emas") — tokenlar bilan bir xil ko'rinish. */
export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const classes = toneClasses[tone];
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-sm px-2 text-xs font-medium whitespace-nowrap ${classes.badge}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${classes.dot}`} />
      {children}
    </span>
  );
}
