import type { StaffRole } from '@/shared/auth/profile';
import { can } from '@/shared/lib/permissions';
import type { OrderStatus } from '@/shared/lib/status-tone';

/**
 * Bosh sahifa ko'rsatkichlari (D-041) — A varianti: backendda statistika
 * endpointi YO'Q (❓ 3, api/task.txt B-063), shuning uchun har kartochka mavjud
 * ro'yxatning `total` qiymatini `limit=1` bilan oladi. Faqat SON — summa va
 * dinamika yo'q.
 *
 * Har kartochka bosilganda o'sha ro'yxat AYNAN shu filtr bilan ochiladi —
 * son va ro'yxat bir-biridan farq qilmasin.
 */
export type KpiSource =
  | { kind: 'orders'; query: Record<string, string | boolean> }
  | { kind: 'customers'; query: Record<string, string | boolean> }
  | { kind: 'supplyReview'; query: { status: OrderStatus } }
  | { kind: 'supplyBranch'; query: { status: OrderStatus } };

export interface KpiCard {
  id: string;
  label: string;
  hint: string;
  href: string;
  tone: 'info' | 'warning' | 'danger' | 'neutral';
  source: KpiSource;
}

const qs = (query: Record<string, string | boolean>) => new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString();

export function kpiCards(me: { id: string; role: StaffRole } | undefined): KpiCard[] {
  if (!me) return [];
  const cards: KpiCard[] = [];
  const add = (card: Omit<KpiCard, 'href'>, path: string) => cards.push({ ...card, href: `${path}?${qs(card.source.query)}` });

  if (can(me.role, 'orders.manage')) {
    if (me.role === 'MANAGER') {
      add({ id: 'mine', label: 'Menga biriktirilgan', hint: 'Barcha holatdagi buyurtmalaringiz', tone: 'info', source: { kind: 'orders', query: { managerId: me.id } } }, '/orders');
    }
    add({ id: 'new', label: 'Yangi buyurtmalar', hint: 'Hali ishga olinmagan', tone: 'info', source: { kind: 'orders', query: { status: 'NEW' } } }, '/orders');
    add({ id: 'urgent', label: 'Tezkor', hint: 'Tezkor deb belgilangan buyurtmalar', tone: 'danger', source: { kind: 'orders', query: { isUrgent: true } } }, '/orders');
    add({ id: 'unpaid', label: 'To‘lanmagan', hint: 'Kutilayotgan to‘lovi bor', tone: 'warning', source: { kind: 'orders', query: { paymentStatus: 'PENDING' } } }, '/orders');
  }
  if (can(me.role, 'supplyOrders.review')) {
    add({ id: 'supply-review', label: 'Yangi ta’minot buyurtmalari', hint: 'Do‘kon filiallaridan markazga', tone: 'info', source: { kind: 'supplyReview', query: { status: 'NEW' } } }, '/supply-orders');
  }
  if (can(me.role, 'supplyOrders.create')) {
    add({ id: 'supply-branch', label: 'Markazga yuborilgan', hint: 'Hali qabul qilinmagan ta’minot buyurtmalari', tone: 'neutral', source: { kind: 'supplyBranch', query: { status: 'NEW' } } }, '/supply-orders');
  }
  if (can(me.role, 'customers.manage')) {
    add({ id: 'customers', label: 'Faol mijozlar', hint: 'Optom hisoblar', tone: 'neutral', source: { kind: 'customers', query: { isActive: true } } }, '/customers');
    add({ id: 'debtors', label: 'Qarzdorlar', hint: 'Balansi qarzda bo‘lgan mijozlar', tone: 'warning', source: { kind: 'customers', query: { hasDebt: true } } }, '/customers');
  }
  return cards;
}
