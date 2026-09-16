import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, type ReactNode } from 'react';
import { queryClient } from '@/shared/query';

// DevTools faqat dev'da — production bundle'ga kirmaydi (import.meta.env.DEV = false → tree-shake)
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : () => null;

/** Global provayderlar (D-005). Auth — D-006 da shu yerga qo'shiladi. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Suspense fallback={null}>
        <ReactQueryDevtools buttonPosition="bottom-right" />
      </Suspense>
    </QueryClientProvider>
  );
}
