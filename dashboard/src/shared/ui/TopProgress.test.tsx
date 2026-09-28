// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/shared/query';
import { TopProgress } from './TopProgress';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const never = () => new Promise<never>(() => {});
const bar = () => screen.getByTestId('top-progress');

function mount() {
  const client = createQueryClient();
  render(
    <QueryClientProvider client={client}>
      <TopProgress />
    </QueryClientProvider>,
  );
  return client;
}

describe('TopProgress', () => {
  it('ma’lumoti yo‘q so‘rovda chiziq chiqadi', async () => {
    const client = mount();
    void client.prefetchQuery({ queryKey: ['a'], queryFn: never });
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(bar().dataset.visible).toBe('true');
  });

  it('fonda qayta yuklash (ma’lumot bor) chiziqni yoqmaydi', async () => {
    const client = mount();
    client.setQueryData(['b'], 1);
    void client.fetchQuery({ queryKey: ['b'], queryFn: never, staleTime: 0 });
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(bar().dataset.visible).toBeUndefined();
  });

  it('saqlash (mutatsiya) paytida chiziq chiqadi', async () => {
    const client = mount();
    void client.getMutationCache().build(client, { mutationFn: never }).execute(undefined);
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(bar().dataset.visible).toBe('true');
  });
});
