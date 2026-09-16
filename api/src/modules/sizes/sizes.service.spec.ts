import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, PrismaService } from '../../prisma';
import { SizesService } from './sizes.service';

/**
 * B-019 · o'lchamlar. Diqqat markazida:
 *   • `label` HAR DOIM haqiqiy o'lchamga mos bo'lishi (filtr shunga tayanadi)
 *   • mahsuloti bor o'lcham o'chirilmasligi
 */
describe('SizesService (B-019)', () => {
  let service: SizesService;
  let findMany: jest.Mock;
  let findUnique: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;
  let remove: jest.Mock;

  const row = (over: Record<string, unknown> = {}) => ({
    id: 's1',
    label: '60x60',
    widthCm: 60,
    heightCm: 60,
    sortOrder: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    _count: { products: 3 },
    ...over,
  });

  const duplicate = () =>
    new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test',
    });

  beforeEach(async () => {
    findMany = jest.fn();
    findUnique = jest.fn();
    create = jest.fn();
    update = jest.fn();
    remove = jest.fn();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        SizesService,
        {
          provide: PrismaService,
          useValue: {
            productSize: {
              findMany,
              findUnique,
              create,
              update,
              delete: remove,
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(SizesService);
  });

  describe('findAllPublic', () => {
    it('🔒 ochiq select’da sortOrder va vaqt belgilari YO‘Q', async () => {
      findMany.mockResolvedValue([]);
      await service.findAllPublic();

      const arg = (
        findMany.mock.calls as [{ select: Record<string, boolean> }][]
      )[0][0];
      expect(arg.select.sortOrder).toBeUndefined();
      expect(arg.select.createdAt).toBeUndefined();
      expect(arg.select.label).toBe(true);
    });

    it('isActive filtri YO‘Q — sxemada bunday ustun yo‘q', async () => {
      findMany.mockResolvedValue([]);
      await service.findAllPublic();

      const arg = (findMany.mock.calls as [{ where?: unknown }][])[0][0];
      expect(arg.where).toBeUndefined();
    });
  });

  describe('create', () => {
    it('label o‘lchamlardan yasaladi', async () => {
      create.mockResolvedValue(row({ label: '30x60', widthCm: 30 }));

      await service.create({ widthCm: 30, heightCm: 60 });

      const arg = (create.mock.calls as [{ data: { label: string } }][])[0][0];
      expect(arg.data.label).toBe('30x60');
    });

    it('takroriy o‘lcham → 409, yozuv bilan tushunarli xabar', async () => {
      create.mockRejectedValue(duplicate());

      await expect(
        service.create({ widthCm: 60, heightCm: 60 }),
      ).rejects.toThrow(/60x60/);
    });

    it('boshqa xato yutib yuborilmaydi', async () => {
      create.mockRejectedValue(new Error('baza uzildi'));

      await expect(
        service.create({ widthCm: 60, heightCm: 60 }),
      ).rejects.toThrow('baza uzildi');
    });
  });

  describe('update', () => {
    it('🔒 eni o‘zgarsa label QAYTA hisoblanadi', async () => {
      findUnique.mockResolvedValue({ widthCm: 60, heightCm: 60 });
      update.mockResolvedValue(row({ label: '30x60', widthCm: 30 }));

      await service.update('s1', { widthCm: 30 });

      const arg = (update.mock.calls as [{ data: { label: string } }][])[0][0];
      // Yuborilmagan bo'y eskisicha (60) olinadi.
      expect(arg.data.label).toBe('30x60');
    });

    it('faqat sortOrder o‘zgarsa label o‘zgarmaydi', async () => {
      findUnique.mockResolvedValue({ widthCm: 60, heightCm: 60 });
      update.mockResolvedValue(row());

      await service.update('s1', { sortOrder: 9 });

      const arg = (update.mock.calls as [{ data: { label: string } }][])[0][0];
      expect(arg.data.label).toBe('60x60');
    });

    it('mavjud bo‘lmagan o‘lcham → 404, yangilashga urinmaydi', async () => {
      findUnique.mockResolvedValue(null);

      await expect(service.update('yo-q', { widthCm: 30 })).rejects.toThrow(
        NotFoundException,
      );
      expect(update).not.toHaveBeenCalled();
    });

    it('mavjud o‘lchamga aylantirish → 409', async () => {
      findUnique.mockResolvedValue({ widthCm: 30, heightCm: 60 });
      update.mockRejectedValue(duplicate());

      await expect(service.update('s1', { widthCm: 60 })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('🔒 mahsuloti bor o‘lcham o‘chirilmaydi → 409, soni aytiladi', async () => {
      findUnique.mockResolvedValue(row({ _count: { products: 3 } }));

      await expect(service.remove('s1')).rejects.toThrow(/3 ta mahsulot/);
      expect(remove).not.toHaveBeenCalled();
    });

    it('bo‘sh o‘lcham o‘chiriladi va o‘chirilgani qaytariladi', async () => {
      findUnique.mockResolvedValue(row({ _count: { products: 0 } }));
      remove.mockResolvedValue({});

      const dto = await service.remove('s1');

      expect(remove).toHaveBeenCalledWith({ where: { id: 's1' } });
      expect(dto).toEqual({
        id: 's1',
        label: '60x60',
        widthCm: 60,
        heightCm: 60,
      });
      // Ichki hisoblagich javobga chiqmaydi.
      expect(dto).not.toHaveProperty('_count');
    });

    it('mavjud bo‘lmagan o‘lcham → 404', async () => {
      findUnique.mockResolvedValue(null);

      await expect(service.remove('yo-q')).rejects.toThrow(NotFoundException);
      expect(remove).not.toHaveBeenCalled();
    });
  });
});
