import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { ImageStorageService } from './image-storage.service';
import type { StorageService } from './storage.interface';

/** T-014 · asl rasm + variantlar birga saqlanadi. */
describe('ImageStorageService (T-014)', () => {
  let save: jest.Mock;
  let saveDerived: jest.Mock;
  let remove: jest.Mock;
  let service: ImageStorageService;
  let png: Buffer;

  beforeAll(async () => {
    png = await sharp({
      create: { width: 1000, height: 500, channels: 4, background: '#fff0' },
    })
      .png()
      .toBuffer();
  });

  beforeEach(() => {
    save = jest.fn().mockResolvedValue({ url: '/uploads/gallery/a.png' });
    saveDerived = jest.fn().mockResolvedValue({ url: 'x' });
    remove = jest.fn().mockResolvedValue(undefined);
    const storage: StorageService = {
      save,
      saveDerived,
      delete: remove,
      read: jest.fn(),
    };
    service = new ImageStorageService(storage);
  });

  it('asl fayl + 400w / 800w / 1600w webp', async () => {
    const input = { buffer: png, folder: 'gallery', extension: 'png' } as const;
    await expect(service.save(input)).resolves.toEqual({
      url: '/uploads/gallery/a.png',
    });
    expect(save).toHaveBeenCalledWith(input);
    const calls = saveDerived.mock.calls as [{ suffix: string }][];
    expect(calls.map(([c]) => c.suffix)).toEqual(['400w', '800w', '1600w']);
    for (const [call] of calls) {
      expect(call).toMatchObject({
        of: '/uploads/gallery/a.png',
        extension: 'webp',
      });
    }
  });

  it('rasm ochilmasa — 400, diskka hech narsa yozilmaydi', async () => {
    const broken = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(32),
    ]);
    await expect(
      service.save({ buffer: broken, folder: 'gallery', extension: 'png' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(save).not.toHaveBeenCalled();
  });

  it('variant saqlanmasa — asl fayl ham qaytarib o‘chiriladi', async () => {
    saveDerived.mockRejectedValueOnce(new Error('disk to‘ldi'));
    await expect(
      service.save({ buffer: png, folder: 'gallery', extension: 'png' }),
    ).rejects.toThrow('disk to‘ldi');
    expect(remove).toHaveBeenCalledWith('/uploads/gallery/a.png');
  });
});
