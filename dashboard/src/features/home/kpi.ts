import type { Schema } from '@/shared/api';
import type { StaffRole } from '@/shared/auth/profile';
import { can } from '@/shared/lib/permissions';
import type { OrderStatus } from '@/shared/lib/status-tone';

export type DashboardStats = Schema<'DashboardStatsDto'>;

/**
 * Bosh sahifa ko'rsatkichlari (D-041).
 *
 * ⚠ AVVAL (A varianti): backendda statistika endpointi yo'q edi, shuning
 *   uchun har kartochka `…?limit=1` yuborib faqat `total` ni olardi —
 *   5–7 so'rov, summa va dinamika yo'q, "kam qolgan mahsulotlar" esa
 *   umuman ko'rsatilmasdi (zaxira holati bo'yicha filtr yo'qligi uchun).
 *
 * ENDI: `GET /admin/dashboard/stats` (api B-063) — BITTA so'rov, summa
 * bilan. Ta'minot buyurtmalari ataylab eski yo'lda qoldirildi: ular bu
 * endpointda yo'q va ularning ro'yxati boshqa endpointdan keladi
 * (`/admin/branch-orders`, `/branch-orders`) — son bilan ro'yxat farq
 * qilib qolmasligi uchun manba o'zgartirilmadi.
 *
 * Har kartochka bosilganda o'sha ro'yxat AYNAN shu filtr bilan ochiladi.
 */

/** Statistika javobidagi SON maydonlari — kartochka qiymati. */
export type StatsCountKey =
  | 'orders.newCount'
  | 'orders.urgentCount'
  | 'orders.unpaidCount'
  | 'orders.todayCount'
  | 'stock.lowCount'
  | 'stock.outOfStockCount'
  | 'customers.activeCount'
  | 'customers.inDebtCount';

/** Statistika javobidagi PUL maydonlari — kartochka ostidagi qo'shimcha satr. */
export type StatsMoneyKey = 'orders.todayTotal' | 'orders.monthTotal';

export type KpiSource =
  /** Qiymat bitta statistika so'rovidan olinadi (B-063). */
  | { kind: 'stats'; count: StatsCountKey; money?: StatsMoneyKey; query: KpiQuery }
  /**
   * Ro'yxatdan `total` (`limit=1`) — statistikada YO'Q kesimlar uchun:
   * menejerning shaxsiy ro'yxati va ta'minot buyurtmalari. Statistika
   * endpointi bu sonlarni bermaydi, shuning uchun ularni "o'xshash"
   * maydon bilan almashtirish YARAMAYDI — kartochka yolg'on son
   * ko'rsatardi.
   */
  | { kind: 'orders'; query: KpiQuery }
  | { kind: 'supplyReview'; query: { status: OrderStatus } }
  | { kind: 'supplyBranch'; query: { status: OrderStatus } };

type KpiQuery = Record<string, string | boolean>;

export interface KpiCard {
  id: string;
  label: string;
  hint: string;
  href: string;
  tone: 'info' | 'warning' | 'danger' | 'neutral' | 'success';
  source: KpiSource;
}

/** `'orders.newCount'` → javobdagi qiymat. Maydon yo'q bo'lsa 0 (UI yiqilmaydi). */
export function statsCount(stats: DashboardStats | undefined, key: StatsCountKey): number {
  if (!stats) return 0;
  const [group, field] = key.split('.') as ['orders' | 'stock' | 'customers', string];
  const value = (stats[group] as Record<string, unknown>)[field];
  return typeof value === 'number' ? value : 0;
}

/** Pul maydoni — SATR bo'lib qaytadi (G6: `Number()` ga aylantirilmaydi). */
export function statsMoney(
  stats: DashboardStats | undefined,
  key: StatsMoneyKey | undefined,
): string | undefined {
  if (!stats || !key) return undefined;
  const [group, field] = key.split('.') as ['orders', string];
  const value = (stats[group] as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : undefined;
}

const qs = (query: KpiQuery) =>
  new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString();

export function kpiCards(me: { id: string; role: StaffRole } | undefined): KpiCard[] {
  if (!me) return [];
  const cards: KpiCard[] = [];
  const add = (card: Omit<KpiCard, 'href'>, path: string) =>
    cards.push({ ...card, href: `${path}?${qs(card.source.query)}` });

  if (can(me.role, 'orders.manage')) {
    if (me.role === 'MANAGER') {
      // ⚠ Shaxsiy kesim — statistika endpointida YO'Q, shuning uchun bu
      //   bitta kartochka eski yo'lda (ro'yxatning `total` i) qoladi.
      add(
        {
          id: 'mine',
          label: 'Menga biriktirilgan',
          hint: 'Barcha holatdagi buyurtmalaringiz',
          tone: 'info',
          source: { kind: 'orders', query: { managerId: me.id } },
        },
        '/orders',
      );
    }
    add(
      {
        id: 'new',
        label: 'Yangi buyurtmalar',
        hint: 'Hali ishga olinmagan',
        tone: 'info',
        source: { kind: 'stats', count: 'orders.newCount', query: { status: 'NEW' } },
      },
      '/orders',
    );
    add(
      {
        id: 'urgent',
        label: 'Tezkor',
        hint: 'Tezkor deb belgilangan buyurtmalar',
        tone: 'danger',
        source: { kind: 'stats', count: 'orders.urgentCount', query: { isUrgent: true } },
      },
      '/orders',
    );
    add(
      {
        id: 'unpaid',
        label: 'To‘lanmagan',
        hint: 'Kutilayotgan to‘lovi bor',
        tone: 'warning',
        source: {
          kind: 'stats',
          count: 'orders.unpaidCount',
          query: { paymentStatus: 'PENDING' },
        },
      },
      '/orders',
    );
    add(
      {
        id: 'today',
        label: 'Bugungi buyurtmalar',
        hint: 'Toshkent kuni bo‘yicha',
        tone: 'success',
        source: {
          kind: 'stats',
          count: 'orders.todayCount',
          money: 'orders.todayTotal',
          query: {},
        },
      },
      '/orders',
    );
  }
  if (can(me.role, 'supplyOrders.review')) {
    add(
      {
        id: 'supply-review',
        label: 'Yangi ta’minot buyurtmalari',
        hint: 'Do‘kon filiallaridan markazga',
        tone: 'info',
        source: { kind: 'supplyReview', query: { status: 'NEW' } },
      },
      '/supply-orders',
    );
  }
  if (can(me.role, 'supplyOrders.create')) {
    add(
      {
        id: 'supply-branch',
        label: 'Markazga yuborilgan',
        hint: 'Hali qabul qilinmagan ta’minot buyurtmalari',
        tone: 'neutral',
        source: { kind: 'supplyBranch', query: { status: 'NEW' } },
      },
      '/supply-orders',
    );
  }
  if (can(me.role, 'stock.view')) {
    // 🆕 B-063 gacha bu ikki kartochka MUMKIN EMAS edi: zaxira holati
    //    bo'yicha filtr yo'qligi uchun sonni faqat butun ro'yxatni
    //    yuklab hisoblash mumkin edi (G10 buni taqiqlaydi).
    add(
      {
        id: 'stock-low',
        label: 'Kam qolgan mahsulotlar',
        hint: 'Chegaradan pastga tushgan zaxira',
        tone: 'warning',
        source: { kind: 'stats', count: 'stock.lowCount', query: { stockStatus: 'LOW' } },
      },
      '/stock',
    );
    add(
      {
        id: 'stock-out',
        label: 'Tugagan mahsulotlar',
        hint: 'Omborda qolmagan',
        tone: 'danger',
        source: {
          kind: 'stats',
          count: 'stock.outOfStockCount',
          query: { stockStatus: 'OUT_OF_STOCK' },
        },
      },
      '/stock',
    );
  }
  if (can(me.role, 'customers.manage')) {
    add(
      {
        id: 'customers',
        label: 'Faol mijozlar',
        hint: 'Optom hisoblar',
        tone: 'neutral',
        source: {
          kind: 'stats',
          count: 'customers.activeCount',
          query: { isActive: true },
        },
      },
      '/customers',
    );
    add(
      {
        id: 'debtors',
        label: 'Qarzdorlar',
        hint: 'Balansi qarzda bo‘lgan mijozlar',
        tone: 'warning',
        source: { kind: 'stats', count: 'customers.inDebtCount', query: { hasDebt: true } },
      },
      '/customers',
    );
  }
  return cards;
}
