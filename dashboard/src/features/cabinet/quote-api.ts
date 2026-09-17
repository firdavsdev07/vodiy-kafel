import { useQuery } from '@tanstack/react-query';
import { api, type Schema } from '@/shared/api';
import { queryKeys } from '@/shared/query';
import { toQuoteItems, type CartLine } from './cart';

export type Quote = Schema<'QuoteResponseDto'>;
export type QuoteLine = Schema<'QuoteItemResponseDto'>;

/** Yetkazib berish yo'nalishi: viloyat + transport BIRGA yoki ikkalasi ham bo'sh. */
export interface RouteSelection {
  regionId: string;
  transportTypeId: string;
}

export const EMPTY_ROUTE: RouteSelection = { regionId: '', transportTypeId: '' };

/**
 * Yo'nalish to'liqmi: ikkalasi ham tanlangan yoki ikkalasi ham bo'sh.
 * Backend yarmini qabul qilmaydi (400) — so'rov ham yuborilmaydi.
 */
export function isRouteReady(route: RouteSelection): boolean {
  return Boolean(route.regionId) === Boolean(route.transportTypeId);
}

export function isPickup(route: RouteSelection): boolean {
  return !route.regionId && !route.transportTypeId;
}

/** Viloyatlar va transport turlari — ochiq endpointlar (mijoz tokeni bilan ham ishlaydi). */
export function useDeliveryOptions() {
  const regions = useQuery({
    queryKey: ['me', 'regions'] as const,
    queryFn: ({ signal }) => api.get('/regions', { signal }),
    staleTime: 10 * 60_000,
  });
  const transportTypes = useQuery({
    queryKey: ['me', 'transport-types'] as const,
    queryFn: ({ signal }) => api.get('/transport-types', { signal }),
    staleTime: 10 * 60_000,
  });
  return { regions, transportTypes };
}

/**
 * Savat hisobi — `POST /calculator/quote` (D-053).
 *
 * ⚠ `useQuery` (mutatsiya emas): savat o'zgarganda natija KESHDAN
 *   olinadi, orqaga-oldinga yurganda qayta so'ralmaydi. POST bo'lsa ham
 *   bu — o'qish amali, hech narsani o'zgartirmaydi.
 *
 * 🔒 FRONTEND NARX YUBORMAYDI: so'rovda faqat `productId` + `pallets`
 *   (va yo'nalish). Filial — tokendan. Yuborilgan `price`/`branchId`
 *   kabi maydonlarni `ValidationPipe` jimgina tashlaydi, lekin biz
 *   ularni umuman yubormaymiz (CLAUDE.md qoida 1, G5).
 */
export function useQuote(lines: readonly CartLine[], route: RouteSelection) {
  const items = toQuoteItems(lines);
  const body = {
    items,
    ...(isPickup(route)
      ? {}
      : { regionId: route.regionId, transportTypeId: route.transportTypeId }),
  };

  return useQuery({
    queryKey: queryKeys.cabinet.quote(body),
    queryFn: ({ signal }) => api.post('/calculator/quote', { body, signal }),
    enabled: items.length > 0 && isRouteReady(route),
    // Narx o'zgarishi mumkin, lekin har harfda so'rov ketmasin
    staleTime: 30_000,
    // Eski natija yangisi kelguncha ko'rinib turadi — summa "sakramaydi"
    placeholderData: (previous) => previous,
    retry: false,
  });
}
