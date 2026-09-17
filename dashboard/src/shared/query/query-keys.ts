/**
 * Query key'lar — YAGONA joy (D-005). Komponentda `['admin', 'products']`
 * satrini qo'lda yozish TAQIQLANADI — faqat `queryKeys.products.list(f)`.
 *
 * Ierarxiya invalidatsiya uchun:
 *   all            ['admin','products']                 ← hammasi
 *   lists()        ['admin','products','list']          ← barcha ro'yxatlar
 *   list(filters)  ['admin','products','list',{...}]
 *   details()      ['admin','products','detail']
 *   detail(id)     ['admin','products','detail','p1']
 * `invalidateQueries({ queryKey: all })` prefiks bo'yicha hammasini oladi.
 */
function domainKeys<const Name extends string>(name: Name) {
  const all = ['admin', name] as const;
  return {
    all,
    lists: () => [...all, 'list'] as const,
    list: <F extends object>(filters: F) => [...all, 'list', filters] as const,
    details: () => [...all, 'detail'] as const,
    detail: (id: string) => [...all, 'detail', id] as const,
  };
}

/**
 * Kabinet key'lari — `['me', …]` prefiksi bilan (D-051). Xodim
 * key'laridan (`['admin', …]`) ATAYLAB ajratilgan: chiqishda yoki aktor
 * almashganda butun daraxtni bitta prefiks bilan tozalash mumkin va
 * mijoz keshi xodim keshiga aralashmaydi.
 */
function meKeys<const Name extends string>(name: Name) {
  const all = ['me', name] as const;
  return {
    all,
    lists: () => [...all, 'list'] as const,
    list: <F extends object>(filters: F) => [...all, 'list', filters] as const,
    details: () => [...all, 'detail'] as const,
    detail: (id: string) => [...all, 'detail', id] as const,
  };
}

export const queryKeys = {
  /** GET /auth/me — joriy xodim profili (D-006). */
  me: ['auth', 'me'] as const,

  /** GET /admin/dashboard/stats — bosh sahifa ko'rsatkichlari (D-041, api B-063). */
  dashboardStats: ['admin', 'dashboard', 'stats'] as const,

  /** Optom mijoz kabineti (EPIC 10). */
  cabinet: {
    /** Butun kabinet keshi — chiqishda shu prefiks bilan tozalanadi. */
    all: ['me'] as const,
    /** GET /me/profile — mijozning o'z profili (D-051). */
    profile: ['me', 'profile'] as const,
    catalog: meKeys('catalog'),
    orders: meKeys('orders'),
    account: ['me', 'account'] as const,
    transactions: meKeys('account-transactions'),
    notifications: meKeys('notifications'),
    unreadCount: ['me', 'notifications', 'unread-count'] as const,
    /** GET /me/updates — fonda ~15 soniyada bir marta (D-058). */
    updates: ['me', 'updates'] as const,
    contracts: meKeys('contracts'),
    /**
     * Savat hisobi — kalkulyator javobi (D-053). Key'ga savat va
     * yo'nalish KIRADI: ular o'zgarsa yangi so'rov ketadi, o'zgarmasa
     * kesh ishlaydi.
     */
    quote: <P extends object>(payload: P) => ['me', 'quote', payload] as const,
    /** To'lov holati — polling (D-055). */
    payment: (id: string) => ['me', 'payment', id] as const,
    /** Buyurtma menejeri bilan bog'lanish (D-056). */
    managerContact: (orderId: string) => ['me', 'manager-contact', orderId] as const,
  },

  products: {
    ...domainKeys('products'),
    /** Qo'lda bog'langan o'xshashlar — `products.all` prefiksi ostida (mahsulot o'zgarsa yangilanadi) */
    similar: (id: string) => ['admin', 'products', 'detail', id, 'similar'] as const,
  },
  factories: domainKeys('factories'),
  sizes: domainKeys('sizes'),
  media: domainKeys('media'),
  gallery: domainKeys('gallery'),
  /** Filial narxlari — GET /admin/branch-products */
  branchProducts: domainKeys('branch-products'),
  productStocks: domainKeys('product-stocks'),
  customers: domainKeys('customers'),
  /** Mijozning individual narx qoidalari — GET /admin/customers/{id}/pricing-rules */
  pricingRules: domainKeys('pricing-rules'),
  orders: domainKeys('orders'),
  /** Ta'minot buyurtmalari — GET /admin/branch-orders */
  supplyOrders: domainKeys('branch-orders'),
  payments: domainKeys('payments'),
  branches: domainKeys('branches'),
  partners: domainKeys('partners'),
  managers: domainKeys('managers'),
  moderators: domainKeys('moderators'),
  regions: domainKeys('regions'),
  transportTypes: domainKeys('transport-types'),
  tariffs: domainKeys('tariffs'),
  settings: domainKeys('settings'),
} as const;

export type AppQueryKey = readonly unknown[];
