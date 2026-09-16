import { describe, expect, it, vi } from 'vitest';
import { createToastStore, MAX_TOASTS } from './toast-store';

describe('toast store (D-008)', () => {
  it('qo‘shish, yopish, obunachilarga xabar', () => {
    const store = createToastStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const id = store.push('success', 'Saqlandi');
    expect(store.getSnapshot()).toEqual([{ id, tone: 'success', message: 'Saqlandi', requestId: undefined }]);
    store.dismiss(id);
    expect(store.getSnapshot()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('snapshot o‘zgarmasa — bir xil obyekt (useSyncExternalStore cheksiz render qilmasin)', () => {
    const store = createToastStore();
    const before = store.getSnapshot();
    store.dismiss(123);
    expect(store.getSnapshot()).toBe(before);
  });

  it('bir xil xabar takrorlanmaydi, eng ko‘pi MAX_TOASTS', () => {
    const store = createToastStore();
    store.push('error', 'Server bilan aloqa yo‘q');
    store.push('error', 'Server bilan aloqa yo‘q');
    expect(store.getSnapshot()).toHaveLength(1);
    for (let i = 0; i < 10; i++) store.push('info', `x${i}`);
    expect(store.getSnapshot()).toHaveLength(MAX_TOASTS);
    expect(store.getSnapshot().at(-1)?.message).toBe('x9');
  });
});
