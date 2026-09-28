// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDelayedFlag } from './use-delayed-flag';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const setup = (active: boolean) =>
  renderHook(({ on }) => useDelayedFlag(on, { delayMs: 150, minVisibleMs: 400 }), { initialProps: { on: active } });

describe('useDelayedFlag', () => {
  it('kechikishdan qisqa ish ko‘rinmaydi', () => {
    const hook = setup(true);
    act(() => vi.advanceTimersByTime(100));
    hook.rerender({ on: false });
    act(() => vi.advanceTimersByTime(1000));
    expect(hook.result.current).toBe(false);
  });

  it('uzun ish kechikishdan keyin ko‘rinadi', () => {
    const hook = setup(true);
    expect(hook.result.current).toBe(false);
    act(() => vi.advanceTimersByTime(150));
    expect(hook.result.current).toBe(true);
  });

  it('ko‘ringan bo‘lsa kamida minVisibleMs turadi', () => {
    const hook = setup(true);
    act(() => vi.advanceTimersByTime(150));
    hook.rerender({ on: false });
    act(() => vi.advanceTimersByTime(300));
    expect(hook.result.current).toBe(true);
    act(() => vi.advanceTimersByTime(100));
    expect(hook.result.current).toBe(false);
  });
});
