import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { ContractStatus } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { PrismaService } from '../../prisma';
import { STORAGE_SERVICE } from '../../storage';
import { QuoteService } from '../calculator/quote.service';
import { AppEvent } from '../notifications/events';
import { ContractGeneratorService } from './contract-generator.service';
import { ContractsService } from './contracts.service';
import {
  COMPANY_LOOKUP_PROVIDER,
  CONTRACT_DELIVERY_CHANNEL,
} from './providers';

/** B-045 · Shartnoma moduli (mock). */
describe('ContractsService (B-045)', () => {
  let service: ContractsService;
  let prisma: {
    customer: { findUniqueOrThrow: jest.Mock };
    order: { findFirst: jest.Mock };
    contract: {
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
    };
  };
  let quotes: { requireCustomer: jest.Mock };
  let generator: { generate: jest.Mock };
  let events: { emit: jest.Mock };
  let companyLookup: { lookup: jest.Mock };
  let delivery: { send: jest.Mock };
  let storage: { save: jest.Mock; read: jest.Mock; delete: jest.Mock };

  const actor: Actor = { id: 'c1', type: 'CUSTOMER', branchId: 'fargona' };

  const companyData = {
    companyName: 'Test MChJ',
    director: 'Test D',
    address: 'Farg‘ona',
    registeredAt: '2020-01-01',
  };

  const contractRow = (over: Record<string, unknown> = {}) => ({
    id: 'ct1',
    inn: '301234567',
    status: ContractStatus.DRAFT,
    pdfUrl: '',
    customerId: 'c1',
    createdAt: new Date('2026-09-16T10:00:00.000Z'),
    order: null,
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      customer: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          companyName: 'Farg‘ona Qurilish MChJ',
          contactName: 'Test Mijoz',
          phone: '+998900000000',
        }),
      },
      order: { findFirst: jest.fn() },
      contract: {
        create: jest.fn().mockResolvedValue(contractRow()),
        update: jest.fn().mockResolvedValue(
          contractRow({
            status: ContractStatus.SENT,
            pdfUrl: '/uploads/contracts/x.pdf',
          }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    quotes = {
      requireCustomer: jest.fn().mockResolvedValue({ customerId: 'c1' }),
    };
    generator = { generate: jest.fn().mockResolvedValue(Buffer.from('PDF')) };
    events = { emit: jest.fn() };
    companyLookup = { lookup: jest.fn().mockResolvedValue(companyData) };
    delivery = { send: jest.fn().mockResolvedValue(undefined) };
    storage = {
      save: jest.fn().mockResolvedValue({ url: '/uploads/contracts/x.pdf' }),
      read: jest.fn().mockResolvedValue(Buffer.from('PDF')),
      delete: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: prisma },
        { provide: QuoteService, useValue: quotes },
        { provide: ContractGeneratorService, useValue: generator },
        { provide: EventEmitter2, useValue: events },
        { provide: COMPANY_LOOKUP_PROVIDER, useValue: companyLookup },
        { provide: CONTRACT_DELIVERY_CHANNEL, useValue: delivery },
        { provide: STORAGE_SERVICE, useValue: storage },
      ],
    }).compile();

    service = moduleRef.get(ContractsService);
  });

  describe('create', () => {
    it('to‘liq oqim: qidiradi → generatsiya → saqlaydi → yuboradi → hodisa chiqaradi', async () => {
      const result = await service.create(actor, { inn: '301234567' });

      expect(companyLookup.lookup).toHaveBeenCalledWith('301234567');
      expect(prisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'c1',
            inn: '301234567',
            status: ContractStatus.DRAFT,
          }) as unknown,
        }),
      );
      expect(generator.generate).toHaveBeenCalledWith(
        expect.objectContaining({ contractId: 'ct1', inn: '301234567' }),
      );
      expect(storage.save).toHaveBeenCalledWith(
        expect.objectContaining({ folder: 'contracts', extension: 'pdf' }),
      );
      expect(prisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ct1' },
          data: {
            pdfUrl: '/uploads/contracts/x.pdf',
            status: ContractStatus.SENT,
          },
        }),
      );
      expect(delivery.send).toHaveBeenCalledWith(
        { companyName: 'Farg‘ona Qurilish MChJ', phone: '+998900000000' },
        {
          contractId: 'ct1',
          downloadPath: '/wholesale/contracts/ct1/download',
        },
      );
      expect(events.emit).toHaveBeenCalledWith(AppEvent.ContractReady, {
        contractId: 'ct1',
      });
      expect(result).toEqual({
        id: 'ct1',
        inn: '301234567',
        status: ContractStatus.SENT,
        orderNumber: null,
        createdAt: contractRow().createdAt,
      });
    });

    it('🔒 orderId berilsa — faqat O‘Z buyurtmasi bo‘lishi kerak, begonasi 404', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.create(actor, { inn: '301234567', orderId: 'begona-order' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.order.findFirst).toHaveBeenCalledWith({
        where: { id: 'begona-order', customerId: 'c1' },
        select: { orderNumber: true },
      });
      expect(companyLookup.lookup).not.toHaveBeenCalled();
    });

    it('orderId o‘zinikida bo‘lsa — orderNumber PDF va javobga qo‘shiladi', async () => {
      prisma.order.findFirst.mockResolvedValueOnce({
        orderNumber: 'VK-2026-000001',
      });
      prisma.contract.update.mockResolvedValueOnce(
        contractRow({
          status: ContractStatus.SENT,
          pdfUrl: '/uploads/contracts/x.pdf',
          order: { orderNumber: 'VK-2026-000001' },
        }),
      );

      const result = await service.create(actor, {
        inn: '301234567',
        orderId: 'o1',
      });

      expect(generator.generate).toHaveBeenCalledWith(
        expect.objectContaining({ orderNumber: 'VK-2026-000001' }),
      );
      expect(result.orderNumber).toBe('VK-2026-000001');
    });
  });

  describe('findMine / findMineOne', () => {
    it('faqat o‘z shartnomalarini qidiradi', async () => {
      await service.findMine(actor, {
        page: 1,
        limit: 20,
        skip: 0,
        take: 20,
      } as never);
      expect(prisma.contract.count).toHaveBeenCalledWith({
        where: { customerId: 'c1' },
      });
    });

    it('🔒 begona shartnoma — 404 (mavjudligi oshkor qilinmaydi)', async () => {
      prisma.contract.findFirst.mockResolvedValueOnce(null);
      await expect(service.findMineOne(actor, 'begona')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('download', () => {
    it('faylni StorageService orqali o‘qiydi', async () => {
      prisma.contract.findFirst.mockResolvedValueOnce(
        contractRow({ pdfUrl: '/uploads/contracts/x.pdf' }),
      );
      const result = await service.download(actor, 'ct1');
      expect(storage.read).toHaveBeenCalledWith('/uploads/contracts/x.pdf');
      expect(result).toEqual({
        buffer: Buffer.from('PDF'),
        filename: 'shartnoma-ct1.pdf',
      });
    });

    it('🔒 begona shartnoma fayli o‘qilmaydi — 404', async () => {
      prisma.contract.findFirst.mockResolvedValueOnce(null);
      await expect(service.download(actor, 'begona')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(storage.read).not.toHaveBeenCalled();
    });
  });
});
