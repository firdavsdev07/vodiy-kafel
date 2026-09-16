import { describe, expect, it } from 'vitest';
import { resolveInitialTheme } from './theme';

describe('resolveInitialTheme (D-002)', () => {
  it('saqlangan tanlov OS sozlamasidan ustun', () => {
    expect(resolveInitialTheme({ stored: 'light', prefersDark: true })).toBe('light');
    expect(resolveInitialTheme({ stored: 'dark', prefersDark: false })).toBe('dark');
  });

  it.each([null, '', 'blue'])('saqlangan qiymat %j yaroqsiz — OS sozlamasi', (stored) => {
    expect(resolveInitialTheme({ stored, prefersDark: true })).toBe('dark');
    expect(resolveInitialTheme({ stored, prefersDark: false })).toBe('light');
  });
});
