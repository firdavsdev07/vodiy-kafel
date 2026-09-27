import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import {
  hasImageVariants,
  imageVariants,
  renderImageVariants,
} from './image-variants';

const UUID = '0b6f1c1e-4a2b-4c3d-9e8f-001122334455';

const jpeg = (width: number, height: number): Promise<Buffer> =>
  sharp({
    create: { width, height, channels: 3, background: '#c9a27a' },
  })
    .jpeg()
    .toBuffer();

/** T-014 · rasm variantlari. */
describe('imageVariants (T-014)', () => {
  it('o‘zimiz yuklagan rasm → uchta webp manzil', () => {
    expect(imageVariants(`/uploads/products/${UUID}.jpg`)).toEqual({
      w400: `/uploads/products/${UUID}-400w.webp`,
      w800: `/uploads/products/${UUID}-800w.webp`,
      w1600: `/uploads/products/${UUID}-1600w.webp`,
    });
    expect(imageVariants(`/uploads/gallery/${UUID}.webp`)?.w800).toBe(
      `/uploads/gallery/${UUID}-800w.webp`,
    );
  });

  it.each([
    ['yo‘q', null],
    ['video', `/uploads/products/${UUID}.mp4`],
    ['tashqi havola', 'https://cdn.example.com/a.jpg'],
    ['PDF', `/uploads/contracts/${UUID}.pdf`],
    ['🔒 papkadan chiqish', '/uploads/../x.jpg'],
    ['variantning o‘zi', `/uploads/products/${UUID}-800w.webp`],
  ])('%s — null', (_label, url) => {
    expect(imageVariants(url)).toBeNull();
    expect(hasImageVariants(url)).toBe(false);
  });
});

describe('renderImageVariants (T-014)', () => {
  const widthsOf = async (buffer: Buffer) =>
    Promise.all(
      (await renderImageVariants(buffer)).map(async (v) => {
        const meta = await sharp(v.buffer).metadata();
        return [v.width, meta.width, meta.format] as const;
      }),
    );

  it('katta rasm — 400 / 800 / 1600 px webp, nisbat saqlanadi', async () => {
    const variants = await renderImageVariants(await jpeg(3200, 1600));
    const metas = await Promise.all(
      variants.map((v) => sharp(v.buffer).metadata()),
    );
    expect(metas.map((m) => [m.width, m.height, m.format])).toEqual([
      [400, 200, 'webp'],
      [800, 400, 'webp'],
      [1600, 800, 'webp'],
    ]);
  });

  it('kichik rasm kattalashtirilmaydi — fayl bor, kengligi asliniki', async () => {
    expect(await widthsOf(await jpeg(600, 400))).toEqual([
      [400, 400, 'webp'],
      [800, 600, 'webp'],
      [1600, 600, 'webp'],
    ]);
  });

  it('ichi buzuq rasm (imzo to‘g‘ri) — 400', async () => {
    const broken = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(64, 7),
    ]);
    await expect(renderImageVariants(broken)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
