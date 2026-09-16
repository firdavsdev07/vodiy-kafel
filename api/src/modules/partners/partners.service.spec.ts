import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma';
import { PartnersService } from './partners.service';

/** B-042 · hamkorlar. */
describe('PartnersService (B-042)', () => {
  let service: PartnersService;
  let partner: Record<string, jest.Mock>;
  let storage: { save: jest.Mock; delete: jest.Mock };

  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
  ]);
  const row = { id: 'p1', name: 'Knauf', logoUrl: '/uploads/partners/old.png' };

  beforeEach(() => {
    partner = {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(row),
      create: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue(row),
      delete: jest.fn().mockResolvedValue(row),
    };
    storage = {
      save: jest.fn().mockResolvedValue({ url: '/uploads/partners/new.png' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    service = new PartnersService(
      { partner } as unknown as PrismaService,
      storage,
    );
  });

  it('ochiq ro‘yxat — faqat faollar, ichki maydonlarsiz', async () => {
    await service.findPublic();
    const [args] = partner.findMany.mock.calls[0] as [
      { where: unknown; select: Record<string, unknown> },
    ];
    expect(args.where).toEqual({ isActive: true });
    expect(args.select).toEqual({
      id: true,
      name: true,
      logoUrl: true,
      websiteUrl: true,
    });
  });

  it('yaratish — logotip saqlanadi, nom trim', async () => {
    await service.create(
      { buffer: png, size: png.length },
      { name: '  Knauf ', sortOrder: 2 },
    );
    expect(storage.save).toHaveBeenCalledWith({
      buffer: png,
      folder: 'partners',
      extension: 'png',
    });
    expect(partner.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'Knauf',
          sortOrder: 2,
          logoUrl: '/uploads/partners/new.png',
        },
      }),
    );
  });

  it('🔒 logotipsiz yoki rasm emas — 400, hech narsa saqlanmaydi', async () => {
    await expect(
      service.create(undefined, { name: 'X' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const html = Buffer.from('<html><script>');
    await expect(
      service.create({ buffer: html, size: html.length }, { name: 'X' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('baza yiqilsa — saqlangan fayl o‘chiriladi', async () => {
    partner.create.mockRejectedValueOnce(new Error('db'));
    await expect(
      service.create({ buffer: png, size: png.length }, { name: 'X' }),
    ).rejects.toThrow('db');
    expect(storage.delete).toHaveBeenCalledWith('/uploads/partners/new.png');
  });

  it('logotip almashtirish — eskisi keyin o‘chiriladi', async () => {
    await service.replaceLogo('p1', { buffer: png, size: png.length });
    expect(partner.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { logoUrl: '/uploads/partners/new.png' },
      }),
    );
    expect(storage.delete).toHaveBeenCalledWith('/uploads/partners/old.png');
  });

  it('o‘chirish — yozuv va fayl; mavjud emas — 404', async () => {
    await service.remove('p1');
    expect(partner.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(storage.delete).toHaveBeenCalledWith('/uploads/partners/old.png');

    partner.findUnique.mockResolvedValueOnce(null);
    await expect(service.remove('yoq')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
