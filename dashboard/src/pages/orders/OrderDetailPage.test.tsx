// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Schema } from '@/shared/api';
import type { StaffRole } from '@/shared/auth/profile';
import { apiError, mockApi, server } from '@/test/msw';
import { renderRoute, setupComponentTests } from '@/test/setup-component';
import OrderDetailPage from './OrderDetailPage';

setupComponentTests();

const me = (role: StaffRole): Schema<'UserProfileResponseDto'> => ({
  id: 'u1',
  phone: '+998900110001',
  email: null,
  fullName: 'Sinov xodim',
  role,
  branchId: role === 'SUPER_ADMIN' ? null : 'b1',
  telegramUsername: null,
});

// 🛡 Tur — schema.d.ts dan: DTO o'zgarsa bu obyekt kompilyatsiya bo'lmaydi
const order: Schema<'AdminOrderDetailDto'> = {
  id: 'o1',
  orderNumber: 'VK-2026-000042',
  status: 'NEW',
  source: 'PHONE',
  branchName: 'Vodiy Kafel — Farg‘ona',
  items: [
    { productId: 'p1', productName: 'Lyuks Granit Bej', productSlug: 'lyuks', pallets: 2, sqm: '2.88', weightKg: '65', pricePerSqm: '78000', lineTotal: '224640' },
  ],
  totalPallets: 2,
  totalSqm: '2.88',
  totalWeightKg: '65',
  itemsTotal: '224640',
  deliveryTotal: '0',
  grandTotal: '224640',
  delivery: null,
  deliveryRequested: false,
  deliveryPending: false,
  requestedTransportTypeName: null,
  exactLat: null,
  exactLng: null,
  note: null,
  createdAt: '2026-09-17T05:00:00.000Z',
  orderingType: 'CUSTOMER',
  dispatchBranch: null,
  isUrgent: true,
  branch: { id: 'b1', name: 'Vodiy Kafel — Farg‘ona' },
  buyer: { customerId: 'c1', name: 'Farg‘ona Qurilish MChJ', contactName: 'Ali', phone: '+998903330001' },
  manager: null,
  payments: [
    { id: 'pay-cash', method: 'CASH', status: 'PENDING', amount: '224640', paidAt: null, providerRef: null },
    { id: 'pay-card', method: 'CARD', status: 'PENDING', amount: '100', paidAt: null, providerRef: 'x' },
  ],
  statusHistory: [{ status: 'NEW', note: null, createdAt: '2026-09-17T05:00:00.000Z', changedBy: null }],
  allowedNextStatuses: ['SEARCHING_TRANSPORT', 'CANCELLED'],
};

const open = (role: StaffRole) => {
  server.use(mockApi.get('/auth/me', me(role)), mockApi.get('/admin/orders/{id}', order));
  renderRoute(<OrderDetailPage />, { path: '/orders/:id', route: '/orders/o1' });
};

describe('<OrderDetailPage> (D-025 … D-029)', () => {
  it('karta: snapshot narx, tezkor, xaridor havolasi, holat tugmalari', async () => {
    open('BRANCH_ADMIN');
    expect(await screen.findByRole('heading', { name: /VK-2026-000042/ })).toBeTruthy();
    expect(screen.getByText('Tezkor')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Farg‘ona Qurilish MChJ' }).getAttribute('href')).toBe('/customers/c1');
    expect(screen.getByText(/buyurtma berilgan paytdagi nusxa/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mashina qidirishni boshlash' })).toBeTruthy();
  });

  it('🔒 BRANCH_ADMIN: naqd to‘lovni tasdiqlay oladi, karta to‘lovini — yo‘q', async () => {
    open('BRANCH_ADMIN');
    const payment = await screen.findByRole('heading', { name: 'To‘lov' });
    const card = payment.closest('section') as HTMLElement;
    // Faqat bitta "Tasdiqlash" — naqd uchun; karta to'lovi avtomatik
    await within(card).findByText('Naqd pul');
    expect(within(card).getAllByRole('button', { name: 'Tasdiqlash' })).toHaveLength(1);
    expect(within(card).getByText(/Karta to‘lovi avtomatik tasdiqlanadi/)).toBeTruthy();
  });

  it('🔒 MANAGER: to‘lov tasdiqlash va biriktirish tugmalari yo‘q', async () => {
    open('MANAGER');
    const payment = await screen.findByRole('heading', { name: 'To‘lov' });
    await within(payment.closest('section') as HTMLElement).findByText('Naqd pul');
    expect(screen.queryByRole('button', { name: 'Tasdiqlash' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Biriktirish' })).toBeNull();
  });

  it('🔒 begona filial buyurtmasi (404) — "topilmadi", "ruxsat yo‘q" EMAS', async () => {
    server.use(mockApi.get('/auth/me', me('BRANCH_ADMIN')), apiError('get', '/admin/orders/{id}', 404, 'Buyurtma topilmadi'));
    renderRoute(<OrderDetailPage />, { path: '/orders/:id', route: '/orders/o1' });
    expect(await screen.findByText(/Topilmadi/)).toBeTruthy();
    expect(screen.queryByText(/ruxsat/i)).toBeNull();
  });
});
