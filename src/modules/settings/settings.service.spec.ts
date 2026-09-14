import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { FALLBACK_LOW_STOCK_THRESHOLD } from '../../common/utils/stock-status.util';
import { Prisma, PrismaService } from '../../prisma';
import { UpdateSettingDto } from './dto';
import { SETTINGS_CACHE_TTL_MS, SettingsService } from './settings.service';
import { VALIDATION_PIPE_OPTIONS } from '../../common/validation';

const REQUISITES = {
  bank: 'Hamkorbank',
  mfo: '00873',
  account: '20208000900123456789',
  inn: '301234567',
  name: 'Vodiy Kafel Savdo MChJ',
};

const row = (key: string, value: unknown, isPublic = false) => ({
  key,
  value,
  description: 'izoh',
  isPublic,
  updatedAt: new Date('2026-01-01'),
});

/** B-025 · sozlamalar. */
describe('SettingsService (B-025)', () => {
  let service: SettingsService;
  let prisma: { setting: { findMany: jest.Mock; upsert: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      setting: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(SettingsService);
  });

  afterEach(() => jest.useRealTimers());

  describe('get', () => {
    it('to‘g‘ri qiymat — o‘zi', async () => {
      prisma.setting.findMany.mockResolvedValue([
        row('stock.lowThresholdPallets', 7),
      ]);
      expect(await service.get('stock.lowThresholdPallets')).toBe(7);
    });

    it.each([
      ['yozuv yo‘q', []],
      ['satr', [row('stock.lowThresholdPallets', '20')]],
      ['manfiy', [row('stock.lowThresholdPallets', -1)]],
      ['butun emas', [row('stock.lowThresholdPallets', 2.5)]],
    ])('%s — standart qiymat', async (_label, rows) => {
      prisma.setting.findMany.mockResolvedValue(rows);
      expect(await service.get('stock.lowThresholdPallets')).toBe(
        FALLBACK_LOW_STOCK_THRESHOLD,
      );
    });

    it('🔒 chegirma chegarasi yo‘q — 0 (cheksiz EMAS)', async () => {
      expect(await service.get('pricing.branchAdminMaxDiscountPercent')).toBe(
        0,
      );
    });
  });

  describe('kesh', () => {
    it('muddat ichida bazaga qayta bormaydi, parallel so‘rovlar — bitta so‘rov', async () => {
      await Promise.all([
        service.get('stock.lowThresholdPallets'),
        service.get('payment.requisites'),
      ]);
      await service.findAdmin();
      expect(prisma.setting.findMany).toHaveBeenCalledTimes(1);
    });

    it('muddat o‘tgach qayta o‘qiydi', async () => {
      jest.useFakeTimers({ now: 0 });
      await service.get('stock.lowThresholdPallets');
      jest.setSystemTime(SETTINGS_CACHE_TTL_MS + 1);
      await service.get('stock.lowThresholdPallets');
      expect(prisma.setting.findMany).toHaveBeenCalledTimes(2);
    });

    it('yozishdan keyin yangi qiymat darhol ko‘rinadi', async () => {
      prisma.setting.findMany.mockResolvedValueOnce([
        row('stock.lowThresholdPallets', 20),
      ]);
      expect(await service.get('stock.lowThresholdPallets')).toBe(20);

      prisma.setting.findMany.mockResolvedValue([
        row('stock.lowThresholdPallets', 30),
      ]);
      await service.update('stock.lowThresholdPallets', 30);
      expect(await service.get('stock.lowThresholdPallets')).toBe(30);
    });

    it('yozishdan OLDIN boshlangan o‘qish eski qiymatni keshga yozmaydi', async () => {
      let finishStale!: (rows: unknown[]) => void;
      prisma.setting.findMany.mockImplementationOnce(
        () => new Promise((resolve) => (finishStale = resolve)),
      );
      const staleRead = service.get('stock.lowThresholdPallets');

      prisma.setting.findMany.mockResolvedValue([
        row('stock.lowThresholdPallets', 30),
      ]);
      await service.update('stock.lowThresholdPallets', 30);

      finishStale([row('stock.lowThresholdPallets', 20)]);
      await staleRead;

      expect(await service.get('stock.lowThresholdPallets')).toBe(30);
    });
  });

  describe('findPublic', () => {
    it('🔒 faqat bazada isPublic bo‘lgan, tanilgan va to‘g‘ri kalitlar', async () => {
      prisma.setting.findMany.mockResolvedValue([
        row('payment.requisites', REQUISITES, true),
        row('pricing.branchAdminMaxDiscountPercent', 20, false),
        row('noma.lum', 'x', true),
        row('stock.lowThresholdPallets', 'buzilgan', true),
      ]);

      expect(await service.findPublic()).toEqual([
        { key: 'payment.requisites', value: REQUISITES },
      ]);
    });
  });

  describe('findAdmin', () => {
    it('bazada yo‘q kalitlar ham — standart qiymat va isDefault', async () => {
      prisma.setting.findMany.mockResolvedValue([
        row('stock.lowThresholdPallets', 15),
      ]);
      const result = await service.findAdmin();

      expect(result.map((item) => item.key)).toEqual([
        'stock.lowThresholdPallets',
        'payment.requisites',
        'pricing.branchAdminMaxDiscountPercent',
      ]);
      expect(result[0]).toMatchObject({ value: 15, isDefault: false });
      expect(result[2]).toMatchObject({
        value: 0,
        isDefault: true,
        isPublic: false,
        updatedAt: null,
      });
    });
  });

  describe('update', () => {
    it.each([
      ['stock.lowThresholdPallets', 'yigirma'],
      ['stock.lowThresholdPallets', -5],
      ['pricing.branchAdminMaxDiscountPercent', 150],
      ['payment.requisites', { ...REQUISITES, mfo: '12' }],
      ['payment.requisites', { ...REQUISITES, ortiqcha: 'x' }],
      ['payment.requisites', 'matn'],
    ] as const)('%s = %j — 400, yozilmaydi', async (key, value) => {
      await expect(service.update(key, value)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.setting.upsert).not.toHaveBeenCalled();
    });

    it('xato matnida qaysi maydon ekani aytiladi', async () => {
      await expect(
        service.update('payment.requisites', { ...REQUISITES, inn: '1' }),
      ).rejects.toThrow('inn');
    });

    it('yangi yozuv — ro‘yxatdagi tavsif va isPublic bilan; mavjudida faqat qiymat', async () => {
      await service.update('payment.requisites', REQUISITES);
      expect(prisma.setting.upsert).toHaveBeenCalledWith({
        where: { key: 'payment.requisites' },
        create: {
          key: 'payment.requisites',
          value: REQUISITES,
          description: 'Bank rekvizitlari (perechislenie uchun)',
          isPublic: true,
        },
        update: { value: REQUISITES },
      });
    });

    it('rekvizitlarni null qilish — JSON null', async () => {
      await service.update('payment.requisites', null);
      const arg = (
        prisma.setting.upsert.mock.calls as [{ update: { value: unknown } }][]
      )[0][0];
      expect(arg.update.value).toBe(Prisma.JsonNull);
    });
  });

  describe('UpdateSettingDto', () => {
    const pipe = new ValidationPipe(VALIDATION_PIPE_OPTIONS);
    const run = (value: object) =>
      pipe.transform(value, { type: 'body', metatype: UpdateSettingDto });

    it('noma’lum kalit — 400', async () => {
      await expect(run({ key: 'x.y', value: 1 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('value: null — o‘tadi (rekvizitlarni tozalash)', async () => {
      const dto = (await run({
        key: 'payment.requisites',
        value: null,
      })) as UpdateSettingDto;
      expect(dto.value).toBeNull();
    });

    it('value yo‘q — 400', async () => {
      await expect(
        run({ key: 'stock.lowThresholdPallets' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('obyekt qiymat whitelist’da yo‘qolmaydi', async () => {
      const dto = (await run({
        key: 'payment.requisites',
        value: REQUISITES,
      })) as UpdateSettingDto;
      expect(dto.value).toEqual(REQUISITES);
    });
  });
});
