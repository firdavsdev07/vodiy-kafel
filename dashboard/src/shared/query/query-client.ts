import { MutationCache, QueryCache, QueryClient, type QueryKey } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/api-error';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: Error;
    mutationMeta: {
      /**
       * Muvaffaqiyatdan keyin yangilanadigan key'lar (D-005 invalidatsiya
       * qoidasi). Masalan buyurtma holati → `[queryKeys.orders.all,
       * queryKeys.productStocks.all]` — zaxira ham o'zgaradi.
       */
      invalidates?: readonly QueryKey[];
    };
  }
}

const MAX_RETRIES = 2;

/**
 * Qayta urinish: 4xx — HECH QACHON (so'rov noto'g'ri, takror ham noto'g'ri;
 * 401 esa refresh oqimiga tegishli). Faqat 5xx va tarmoq xatosi.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (error instanceof ApiError) return error.isNetworkError || error.statusCode >= 500;
  return false; // kod xatosi (TypeError va h.k.) — takrorlash yordam bermaydi
}

type UnauthorizedHandler = (error: ApiError) => void;
let onUnauthorized: UnauthorizedHandler = () => {};

/**
 * 401 uchun global handler — D-006 ulaydi (refresh → bo'lmasa logout).
 * Har bir sahifa 401 ni o'zi ushlamaydi.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

function handleGlobalError(error: unknown): void {
  if (error instanceof ApiError && error.statusCode === 401) onUnauthorized(error);
}

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handleGlobalError }),
    mutationCache: new MutationCache({
      onError: handleGlobalError,
      onSuccess: async (_data, _variables, _context, mutation) => {
        const keys = mutation.meta?.invalidates ?? [];
        await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
      },
    }),
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // Admin panel: 30 s ichida sahifalar orasida yurish qayta so'rov yubormaydi,
        // oyna fokusga qaytganda eskirgan ma'lumot yangilanadi.
        staleTime: 30_000,
        refetchOnWindowFocus: true,
      },
      mutations: {
        // Mutatsiya takrorlanmaydi — ikki marta buyurtma/to'lov yaratilishi xavfi
        retry: false,
      },
    },
  });
  return client;
}

export const queryClient = createQueryClient();
