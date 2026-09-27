// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocationPicker } from './LocationPicker';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Nominatim taqlidi: qidiruv — bitta natija, teskari geokodlash — manzil. */
function stubNominatim() {
  const fetchMock = vi.fn(async (url: string) => {
    const body = url.includes('/search')
      ? [{ lat: '40.3864', lon: '71.7864', display_name: 'Mustaqillik ko‘chasi, Farg‘ona' }]
      : { display_name: 'Mustaqillik ko‘chasi 12, Farg‘ona' };
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('LocationPicker (filial formasi, T-016)', () => {
  it('🔒 qidiruvda Enter — TASHQI forma yuborilmaydi, faqat qidiriladi', async () => {
    const fetchMock = stubNominatim();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const onChange = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <LocationPicker value={{ lat: '', lng: '' }} onChange={onChange} />
      </form>,
    );

    await userEvent.type(screen.getByLabelText('Manzil qidirish'), 'Mustaqillik{Enter}');

    await screen.findByText('Mustaqillik ko‘chasi, Farg‘ona');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/search?');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('countrycodes=uz');
  });

  it('natija tanlansa — nuqta 6 xona aniqlikda uzatiladi va manzili ko‘rsatiladi', async () => {
    stubNominatim();
    const onChange = vi.fn();
    const { rerender } = render(<LocationPicker value={{ lat: '', lng: '' }} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Manzil qidirish'), 'Mustaqillik');
    await userEvent.click(screen.getByRole('button', { name: 'Qidirish' }));
    await userEvent.click(await screen.findByText('Mustaqillik ko‘chasi, Farg‘ona'));

    expect(onChange).toHaveBeenCalledWith({ lat: '40.386400', lng: '71.786400' });
    rerender(<LocationPicker value={{ lat: '40.386400', lng: '71.786400' }} onChange={onChange} />);
    await waitFor(() => expect(screen.getByText(/Mustaqillik ko‘chasi 12/)).toBeTruthy());
  });

  it('noto‘g‘ri qo‘lda kiritilgan qiymat — marker yo‘q, bo‘sh holat matni, yiqilmaydi', () => {
    render(<LocationPicker value={{ lat: 'abc', lng: '71' }} onChange={vi.fn()} emptyText="Do‘kon joyini belgilang" />);
    expect(screen.getByText('Do‘kon joyini belgilang')).toBeTruthy();
  });
});
