import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * D-002 · kontrast (UX tamoyili: "yetarli kontrast", light/dark bir xil).
 * Tokenlar styles.css dan o'qiladi — rang o'zgarsa test o'zi tekshiradi.
 */
const css = readFileSync(
  fileURLToPath(new URL('./styles.css', import.meta.url)),
  'utf8',
);

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [
      m[1] as string,
      m[2] as string,
    ]),
  );
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;

describe.each([
  ['light', ':root'],
  ['dark', "[data-theme='dark']"],
])('%s rejim kontrasti (WCAG AA)', (_mode, selector) => {
  const t = tokens(selector);
  const pairs: [string, string][] = [
    ['text', 'bg'],
    ['text', 'surface'],
    ['text', 'surface-muted'],
    ['text-muted', 'bg'],
    ['text-muted', 'surface'],
    ['accent-contrast', 'accent'],
    ['success', 'success-soft'],
    ['warning', 'warning-soft'],
    ['danger', 'danger-soft'],
    ['info', 'info-soft'],
    ['neutral', 'neutral-soft'],
  ];

  it.each(pairs)('%s ustida %s ≥ 4.5', (fg, bg) => {
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(contrast(t[fg] as string, t[bg] as string)).toBeGreaterThanOrEqual(AA);
  });
});
