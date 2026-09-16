import { PaymentStatus } from '../../../common/enums';
import { toMoney } from '../../../common/utils';
import {
  MOCK_SIGNATURE_HEADER,
  MockPaymentProvider,
} from './mock-payment.provider';

/** B-033 · soxta to'lov provayderi. */
describe('MockPaymentProvider (B-033)', () => {
  const order = { id: 'o1', orderNumber: 'VK-2026-000007' };
  const amount = toMoney('1123200');

  afterEach(() => jest.useRealTimers());

  it('createPayment — mock_<uuid>, QR matni, PENDING', async () => {
    const provider = new MockPaymentProvider({ autoPaid: false });
    const intent = await provider.createPayment(order, amount, 'k1');

    expect(intent.providerRef).toMatch(/^mock_[0-9a-f-]{36}$/);
    expect(intent.qrPayload).toContain('VK-2026-000007');
    expect(intent.qrPayload).toContain('1123200.00');
    expect(intent.status).toBe(PaymentStatus.PENDING);
    await expect(provider.checkStatus(intent.providerRef)).resolves.toBe(
      PaymentStatus.PENDING,
    );
  });

  it('bir xil idempotencyKey — o‘sha to‘lov, yangisi ochilmaydi', async () => {
    const provider = new MockPaymentProvider({ autoPaid: false });
    const first = await provider.createPayment(order, amount, 'k1');
    const again = await provider.createPayment(order, amount, 'k1');
    const other = await provider.createPayment(order, amount, 'k2');

    expect(again.providerRef).toBe(first.providerRef);
    expect(other.providerRef).not.toBe(first.providerRef);
  });

  it('noma’lum providerRef — PENDING (hech qachon PAID emas)', async () => {
    const provider = new MockPaymentProvider({ autoPaid: false });
    await expect(provider.checkStatus('mock_unknown')).resolves.toBe(
      PaymentStatus.PENDING,
    );
  });

  describe('🔒 webhook imzosi', () => {
    it('buildWebhook yasagan so‘rov — o‘tadi va hodisaga aylanadi', async () => {
      const provider = new MockPaymentProvider({ autoPaid: false });
      const request = provider.buildWebhook('mock_1', PaymentStatus.PAID);

      expect(provider.verifyWebhook(request)).toBe(true);
      const event = await provider.handleWebhook(request);
      expect(event).toMatchObject({
        providerRef: 'mock_1',
        status: PaymentStatus.PAID,
        rawPayload: request.body,
      });
      expect(event.eventId).toMatch(/^mock_evt_/);
      expect(event.paidAt).toBeInstanceOf(Date);
      await expect(provider.checkStatus('mock_1')).resolves.toBe(
        PaymentStatus.PAID,
      );
    });

    it.each([
      ['sarlavhasiz', {}],
      ['soxta imzo', { [MOCK_SIGNATURE_HEADER]: 'x'.repeat(64) }],
      ['massiv', { [MOCK_SIGNATURE_HEADER]: ['a', 'b'] }],
    ])('%s — rad etiladi', (_label, headers) => {
      const provider = new MockPaymentProvider({ autoPaid: false });
      expect(
        provider.verifyWebhook({
          headers,
          body: { providerRef: 'mock_1', status: PaymentStatus.PAID },
        }),
      ).toBe(false);
    });

    it('boshqa jarayon (instansiya) imzosi — rad etiladi', () => {
      const a = new MockPaymentProvider({ autoPaid: false });
      const b = new MockPaymentProvider({ autoPaid: false });
      expect(
        b.verifyWebhook(a.buildWebhook('mock_1', PaymentStatus.PAID)),
      ).toBe(false);
    });

    it('FAILED — paidAt yo‘q', async () => {
      const provider = new MockPaymentProvider({ autoPaid: false });
      const event = await provider.handleWebhook(
        provider.buildWebhook('mock_1', PaymentStatus.FAILED),
      );
      expect(event.status).toBe(PaymentStatus.FAILED);
      expect(event.paidAt).toBeUndefined();
    });
  });

  describe('avto-to‘lov', () => {
    it('yoqilgan — kechikishdan keyin PAID webhook yuboriladi', async () => {
      jest.useFakeTimers();
      const provider = new MockPaymentProvider({ autoPaid: true });
      const listener = jest.fn();
      provider.onAutoPay(listener);

      const intent = await provider.createPayment(order, amount, 'k1');
      jest.advanceTimersByTime(9_999);
      expect(listener).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(listener).toHaveBeenCalledTimes(1);
      const [request] = listener.mock.calls[0] as [
        Parameters<MockPaymentProvider['verifyWebhook']>[0],
      ];
      expect(provider.verifyWebhook(request)).toBe(true);
      expect(request.body).toMatchObject({
        providerRef: intent.providerRef,
        status: PaymentStatus.PAID,
      });
    });

    it('oldin qo‘lda yakunlangan — avto-to‘lov yubormaydi', async () => {
      jest.useFakeTimers();
      const provider = new MockPaymentProvider({ autoPaid: true });
      const listener = jest.fn();
      provider.onAutoPay(listener);

      const intent = await provider.createPayment(order, amount, 'k1');
      provider.buildWebhook(intent.providerRef, PaymentStatus.FAILED);
      jest.advanceTimersByTime(10_000);
      expect(listener).not.toHaveBeenCalled();
    });

    it('o‘chirilgan — hech narsa yuborilmaydi', async () => {
      jest.useFakeTimers();
      const provider = new MockPaymentProvider({ autoPaid: false });
      const listener = jest.fn();
      provider.onAutoPay(listener);

      await provider.createPayment(order, amount, 'k1');
      jest.advanceTimersByTime(60_000);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
