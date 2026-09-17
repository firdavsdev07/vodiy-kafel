import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { tokenStore } from '@/shared/auth';
import { createQueryClient } from '@/shared/query/query-client';
import { Toaster } from '@/shared/ui/Toaster';
import { server } from './msw';

/**
 * Komponent testi muhiti (D-045). Faylning boshida:
 *   // @vitest-environment jsdom
 *   setupComponentTests();
 */
export function setupComponentTests() {
  beforeAll(() => {
    // jsdom `<dialog>` ning modal API'sini bilmaydi — Modal (D-008) shunga tayanadi
    const proto = window.HTMLDialogElement?.prototype;
    if (proto && !proto.showModal) {
      proto.showModal = function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      };
      proto.close = function (this: HTMLDialogElement) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      };
    }
    // Kutilmagan so'rov — testni yiqitadi (mock unutilgani sezilsin)
    server.listen({ onUnhandledRequest: 'error' });
  });
  beforeEach(() => {
    // `useProfile` sessiya bo'lsagina so'rov yuboradi
    tokenStore.setTokens({ accessToken: 'test-access', refreshToken: 'test-refresh' });
  });
  afterEach(() => {
    cleanup();
    server.resetHandlers();
    tokenStore.clear();
  });
  afterAll(() => server.close());
}

/** Sahifani haqiqiy provayderlar bilan chizish: TanStack Query (yangi kesh) + router + toast. */
export function renderRoute(element: ReactElement, { path = '/', route = '/' }: { path?: string; route?: string } = {}) {
  const client = createQueryClient();
  const router = createMemoryRouter([{ path, element }], { initialEntries: [route] });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
}
