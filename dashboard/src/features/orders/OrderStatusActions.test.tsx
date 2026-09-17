// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Schema } from '@/shared/api';
import { mockApi, server, apiError } from '@/test/msw';
import { renderRoute, setupComponentTests } from '@/test/setup-component';
import { useChangeOrderStatus } from './api';
import { OrderStatusActions } from './OrderStatusActions';
import type { OrderStatus } from '@/shared/lib/status-tone';

setupComponentTests();

function Harness({ allowed }: { allowed: OrderStatus[] }) {
  const change = useChangeOrderStatus('o1');
  return <OrderStatusActions orderNumber="VK-2026-000001" allowed={allowed} change={change} />;
}

const changed = (status: OrderStatus, note: string | null): Schema<'OrderStatusChangeResponseDto'> => ({
  id: 'o1',
  orderNumber: 'VK-2026-000001',
  status,
  allowedNextStatuses: [],
  statusHistory: [{ status, note, createdAt: '2026-09-17T10:00:00.000Z', changedBy: null }],
});

describe('<OrderStatusActions> (D-026, G8)', () => {
  it('tugmalar FAQAT allowedNextStatuses dan; bekor qilish alohida', () => {
    renderRoute(<Harness allowed={['LOADING', 'CANCELLED']} />);
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toEqual(['Yuklashni boshlash', 'Buyurtmani bekor qilish']);
    expect(screen.queryByText('Yetkazildi deb belgilash')).toBeNull();
  });

  it('yakuniy holat — tugma yo‘q', () => {
    renderRoute(<Harness allowed={[]} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText(/Yakuniy holat/)).toBeTruthy();
  });

  it('bekor qilishda sabab majburiy; sabab bilan PATCH ketadi', async () => {
    let body: unknown;
    server.use(
      mockApi.patch('/admin/orders/{id}/status', (request) =>
        request.json().then((json) => {
          body = json;
          return changed('CANCELLED', 'Mijoz rad etdi');
        }),
      ),
    );
    const user = userEvent.setup();
    renderRoute(<Harness allowed={['LOADING', 'CANCELLED']} />);

    await user.click(screen.getByRole('button', { name: 'Buyurtmani bekor qilish' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Bekor qilish' }));
    expect(await within(dialog).findByText(/Bekor qilish sababini yozing/)).toBeTruthy();
    expect(body).toBeUndefined();

    await user.type(within(dialog).getByLabelText(/Sabab/), 'Mijoz rad etdi');
    await user.click(within(dialog).getByRole('button', { name: 'Bekor qilish' }));
    await waitFor(() => expect(body).toEqual({ status: 'CANCELLED', note: 'Mijoz rad etdi' }));
  });

  it('409 (boshqa xodim ulgurdi) — xato oynada qoladi', async () => {
    server.use(apiError('patch', '/admin/orders/{id}/status', 409, 'Buyurtma holati hozirgina boshqa xodim tomonidan o‘zgartirildi — sahifani yangilang'));
    const user = userEvent.setup();
    renderRoute(<Harness allowed={['LOADING', 'CANCELLED']} />);
    await user.click(screen.getByRole('button', { name: 'Yuklashni boshlash' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Tasdiqlash' }));
    expect(await within(dialog).findByText(/boshqa xodim tomonidan o‘zgartirildi/)).toBeTruthy();
  });
});
