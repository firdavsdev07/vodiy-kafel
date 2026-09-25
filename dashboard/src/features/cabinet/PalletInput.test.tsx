// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { normalizePalletDraft } from './cart';
import { PalletInput } from './PalletInput';

afterEach(cleanup);

function Harness({ initial = 1, max }: { initial?: number; max?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <PalletInput aria-label="Paddon soni" value={value} onChange={setValue} max={max} />
      <output data-testid="value">{value}</output>
      <button type="button" onClick={() => setValue((v) => v + 1)}>
        +
      </button>
    </>
  );
}

const input = () => screen.getByLabelText('Paddon soni') as HTMLInputElement;
const value = () => screen.getByTestId('value').textContent;

describe('normalizePalletDraft', () => {
  it.each([
    ['05', '5'],
    ['007', '7'],
    ['0', '0'],
    ['', ''],
    ['1a2', '12'],
    ['-3', '3'],
    ['2.5', '25'],
  ])('%j → %j', (raw, expected) => {
    expect(normalizePalletDraft(raw)).toBe(expected);
  });
});

describe('<PalletInput> (T-002)', () => {
  it('🐞 tozalab 5 terilsa — "05" emas, 5', async () => {
    render(<Harness />);
    await userEvent.clear(input());
    await userEvent.type(input(), '5');
    expect(input().value).toBe('5');
    expect(value()).toBe('5');
  });

  it('🐞 tanlab ustidan 12 terilsa — "112" emas, 12', async () => {
    render(<Harness />);
    await userEvent.tripleClick(input());
    await userEvent.keyboard('12');
    expect(input().value).toBe('12');
    expect(value()).toBe('12');
  });

  it('bo‘sh qoldirib chiqilsa — oxirgi to‘g‘ri qiymat qaytadi', async () => {
    render(<Harness initial={3} />);
    await userEvent.clear(input());
    expect(input().value).toBe('');
    expect(value()).toBe('3');
    await userEvent.tab();
    expect(input().value).toBe('3');
  });

  it('0 → chiqilganda eng kami (1)', async () => {
    render(<Harness initial={4} />);
    await userEvent.clear(input());
    await userEvent.type(input(), '0');
    await userEvent.tab();
    expect(input().value).toBe('1');
    expect(value()).toBe('1');
  });

  it('chegaradan oshsa — chiqilganda max ga tushadi', async () => {
    render(<Harness max={20} />);
    await userEvent.clear(input());
    await userEvent.type(input(), '35');
    expect(value()).toBe('3'); // "3" chegarada edi, "35" esa hali yuborilmaydi
    await userEvent.tab();
    expect(input().value).toBe('20');
    expect(value()).toBe('20');
  });

  it('tashqi qiymat o‘zgarsa (+ tugmasi) — maydon ham yangilanadi', async () => {
    render(<Harness initial={2} />);
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    expect(input().value).toBe('3');
  });
});
