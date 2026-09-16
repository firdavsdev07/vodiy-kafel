import { UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountTransactionType, PaymentStatus } from '../../common/enums';
import { Prisma, PrismaService } from '../../prisma';
import { AccountLedgerService } from '../accounts/account-ledger.service';
import { PaymentSettlementService } from './payment-settlement.service';
import { PaymentWebhookService } from './payment-webhook.service';
import {
  PAYMENT_PROVIDER,
  type PaymentEvent,
  type PaymentProvider,
} from './providers';

/** B-033/B-034 · webhook xabarini bazaga qo'llash (idempotent) + hisob. */
describe('PaymentWebhookService', () => {
  let service: PaymentWebhookService;
  let events: { emit: jest.Mock };
  let provider: jest.Mocked<PaymentProvider>;
  let tx: { payment: { findFirst: jest.Mock; updateMany: jest.Mock } };
  let ledger: { record: jest.Mock };

  const payment = (
    status: PaymentStatus,
    customerId: string | null = 'c1',
  ) => ({
    id: 'p1',
    status,
    amount: new Prisma.Decimal('1123200'),
    orderId: 'o1',
    order: { orderNumber: 'VK-2026-000007', customerId },
  });

  const request = { headers: {}, body: { any: 'thing' } };
  const paidAt = new Date('2026-09-16T10:00:00Z');
  const event = (over: Partial<PaymentEvent> = {}): PaymentEvent => ({
    eventId: 'evt1',
    providerRef: 'ref1',
    status: PaymentStatus.PAID,
    paidAt,
    rawPayload: { raw: true },
    ...over,
  });

  beforeEach(async () => {
    events = { emit: jest.fn() };
    provider = {
      createPayment: jest.fn(),
      checkStatus: jest.fn(),
      verifyWebhook: jest.fn().mockReturnValue(true),
      handleWebhook: jest.fn().mockResolvedValue(event()),
    };
    tx = {
      payment: {
        findFirst: jest.fn().mockResolvedValue(payment(PaymentStatus.PENDING)),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    ledger = { record: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentWebhookService,
        PaymentSettlementService,
        { provide: AccountLedgerService, useValue: ledger },
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
        { provide: PAYMENT_PROVIDER, useValue: provider },
      ],
    }).compile();

    service = moduleRef.get(PaymentWebhookService);
  });

  it('🔒 imzo noto‘g‘ri — 401, tana o‘qilmaydi, baza tegilmaydi', async () => {
    provider.verifyWebhook.mockReturnValueOnce(false);
    await expect(service.process(request)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(provider.handleWebhook.mock.calls).toHaveLength(0);
    expect(tx.payment.findFirst).not.toHaveBeenCalled();
  });

  it('PENDING → PAID: paidAt va xom tana yoziladi, qulf WHERE status', async () => {
    const result = await service.process(request);

    expect(tx.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { providerRef: 'ref1' } }),
    );
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.PAID,
        paidAt,
        rawPayload: { raw: true },
      },
    });
    expect(result).toEqual({
      outcome: 'APPLIED',
      paymentId: 'p1',
      status: PaymentStatus.PAID,
      reply: { ok: true },
    });
  });

  it('PAID, provayder vaqt bermasa — hozirgi vaqt (CHECK: PAID ⟺ paidAt)', async () => {
    provider.handleWebhook.mockResolvedValueOnce(event({ paidAt: undefined }));
    await service.process(request);
    const [{ data }] = tx.payment.updateMany.mock.calls[0] as [
      { data: { paidAt: Date } },
    ];
    expect(data.paidAt).toBeInstanceOf(Date);
  });

  it('PENDING → FAILED: paidAt null', async () => {
    provider.handleWebhook.mockResolvedValueOnce(
      event({ status: PaymentStatus.FAILED, paidAt: undefined }),
    );
    await service.process(request);
    expect(tx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentStatus.FAILED,
          paidAt: null,
        }) as unknown,
      }),
    );
  });

  it('🔒 takroriy xabar (allaqachon PAID) — DUPLICATE, yozilmaydi', async () => {
    tx.payment.findFirst.mockResolvedValueOnce(payment(PaymentStatus.PAID));
    const result = await service.process(request);
    expect(result.outcome).toBe('DUPLICATE');
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
  });

  it('🔒 parallel xabar bizdan oldin yozdi (count 0) — DUPLICATE', async () => {
    tx.payment.updateMany.mockResolvedValueOnce({ count: 0 });
    const result = await service.process(request);
    expect(result.outcome).toBe('DUPLICATE');
  });

  it.each([
    ['FAILED to‘lovga PAID', PaymentStatus.FAILED, PaymentStatus.PAID],
    ['PAID to‘lovga FAILED', PaymentStatus.PAID, PaymentStatus.FAILED],
    ['CANCELLED to‘lovga PAID', PaymentStatus.CANCELLED, PaymentStatus.PAID],
    ['PENDING xabari', PaymentStatus.PENDING, PaymentStatus.PENDING],
  ])('%s — o‘zgarmaydi', async (_label, current, incoming) => {
    tx.payment.findFirst.mockResolvedValueOnce(payment(current));
    provider.handleWebhook.mockResolvedValueOnce(event({ status: incoming }));

    const result = await service.process(request);
    expect(['IGNORED', 'DUPLICATE']).toContain(result.outcome);
    expect(result.status).toBe(current);
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
    expect(ledger.record).not.toHaveBeenCalled();
  });

  it('noma’lum providerRef — UNKNOWN', async () => {
    tx.payment.findFirst.mockResolvedValueOnce(null);
    const result = await service.process(request);
    expect(result).toMatchObject({ outcome: 'UNKNOWN', paymentId: null });
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
  });

  it('provayder javobi (reply) o‘zgarishsiz qaytariladi', async () => {
    provider.handleWebhook.mockResolvedValueOnce(
      event({ reply: { result: { allow: true } } }),
    );
    const result = await service.process(request);
    expect(result.reply).toEqual({ result: { allow: true } });
  });

  describe('payment.paid hodisasi (B-037)', () => {
    it('APPLIED + PAID — chiqariladi', async () => {
      await service.process(request);
      expect(events.emit).toHaveBeenCalledWith('payment.paid', {
        paymentId: 'p1',
      });
    });

    it('🔒 takroriy xabar — IKKINCHI marta chiqmaydi', async () => {
      tx.payment.findFirst.mockResolvedValueOnce(payment(PaymentStatus.PAID));
      await service.process(request);
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('FAILED — chiqmaydi', async () => {
      provider.handleWebhook.mockResolvedValueOnce(
        event({ status: PaymentStatus.FAILED, paidAt: undefined }),
      );
      await service.process(request);
      expect(events.emit).not.toHaveBeenCalled();
    });
  });

  describe('mijoz hisobi (B-034)', () => {
    it('PAID — shu tranzaksiyada PAYMENT, manfiy summa, to‘lov/buyurtmaga bog‘langan', async () => {
      await service.process(request);
      expect(ledger.record).toHaveBeenCalledTimes(1);
      const [txArg, entry] = ledger.record.mock.calls[0] as [
        unknown,
        { amount: Prisma.Decimal } & Record<string, unknown>,
      ];
      expect(txArg).toBe(tx);
      expect(entry).toMatchObject({
        customerId: 'c1',
        type: AccountTransactionType.PAYMENT,
        orderId: 'o1',
        paymentId: 'p1',
        createdByUserId: null,
      });
      expect(entry.amount.toString()).toBe('-1123200');
    });

    it('🔒 takroriy PAID / parallel yutqazgan — hisobga IKKINCHI marta tushmaydi', async () => {
      tx.payment.updateMany.mockResolvedValueOnce({ count: 0 });
      await service.process(request);
      expect(ledger.record).not.toHaveBeenCalled();
    });

    it('FAILED — hisob yozuvi yo‘q', async () => {
      provider.handleWebhook.mockResolvedValueOnce(
        event({ status: PaymentStatus.FAILED, paidAt: undefined }),
      );
      await service.process(request);
      expect(ledger.record).not.toHaveBeenCalled();
    });

    it('hisobsiz xaridor (telefon buyurtmasi) — hisob yozuvi yo‘q', async () => {
      tx.payment.findFirst.mockResolvedValueOnce(
        payment(PaymentStatus.PENDING, null),
      );
      const result = await service.process(request);
      expect(result.outcome).toBe('APPLIED');
      expect(ledger.record).not.toHaveBeenCalled();
    });

    it('provayder CANCELLED xabari — e’tiborsiz (faqat PAID/FAILED qo‘llanadi)', async () => {
      provider.handleWebhook.mockResolvedValueOnce(
        event({ status: PaymentStatus.CANCELLED, paidAt: undefined }),
      );
      const result = await service.process(request);
      expect(result.outcome).toBe('IGNORED');
      expect(tx.payment.updateMany).not.toHaveBeenCalled();
    });
  });
});
