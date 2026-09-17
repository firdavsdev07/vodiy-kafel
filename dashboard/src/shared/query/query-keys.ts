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

export const queryKeys = {
  /** GET /auth/me — joriy xodim profili (D-006). */
  me: ['auth', 'me'] as const,

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
