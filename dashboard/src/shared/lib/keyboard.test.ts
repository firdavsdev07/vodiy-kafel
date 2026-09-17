import { describe, expect, it } from 'vitest';
import { isTypingTarget, nextIndex } from './keyboard';

describe('klaviatura (D-044)', () => {
  it('matn yozilayotganda global tugma ishlamaydi', () => {
    const el = (tagName: string, extra: object = {}) => ({ tagName, ...extra }) as unknown as EventTarget;
    expect(isTypingTarget(el('INPUT', { type: 'search' }))).toBe(true);
    expect(isTypingTarget(el('INPUT', { type: 'checkbox' }))).toBe(false);
    expect(isTypingTarget(el('TEXTAREA'))).toBe(true);
    expect(isTypingTarget(el('DIV', { isContentEditable: true }))).toBe(true);
    expect(isTypingTarget(el('BUTTON'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it('jadvalda o‘q tugmalari: chegarada to‘xtaydi, Home/End', () => {
    expect(nextIndex('ArrowDown', 0, 3)).toBe(1);
    expect(nextIndex('ArrowDown', 2, 3)).toBe(2);
    expect(nextIndex('ArrowUp', 0, 3)).toBe(0);
    expect(nextIndex('End', 0, 3)).toBe(2);
    expect(nextIndex('Home', 2, 3)).toBe(0);
    expect(nextIndex('Enter', 1, 3)).toBeNull();
    expect(nextIndex('ArrowDown', 0, 0)).toBeNull();
  });
});
