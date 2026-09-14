import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectFileKind } from './file-signature';
import { LocalDiskStorage } from './local-disk.storage';

const bytes = (...parts: (number[] | string)[]): Buffer =>
  Buffer.concat(
    parts.map((part) =>
      typeof part === 'string' ? Buffer.from(part, 'ascii') : Buffer.from(part),
    ),
  );

const SAMPLE = {
  jpg: bytes([0xff, 0xd8, 0xff, 0xe0], 'JFIF'),
  png: bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'IHDR'),
  webp: bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '),
  mp4: bytes([0, 0, 0, 0x18], 'ftypisom', [0, 0, 0, 0]),
};

describe('detectFileKind (B-022)', () => {
  it.each(Object.entries(SAMPLE))('%s — taniladi', (kind, buffer) => {
    expect(detectFileKind(buffer)).toBe(kind);
  });

  it.each([
    [
      'SVG (stored XSS xavfi)',
      bytes('<svg xmlns="http://www.w3.org/2000/svg">'),
    ],
    ['HTML', bytes('<!doctype html><script>')],
    ['HEIC (ftyp, lekin mp4 brendi emas)', bytes([0, 0, 0, 0x18], 'ftypheic')],
    ['RIFF, lekin WEBP emas (WAV)', bytes('RIFF', [0, 0, 0, 0], 'WAVEfmt ')],
    ['bo‘sh', Buffer.alloc(0)],
    ['qisqa', Buffer.from([0xff, 0xd8])],
  ])('%s — rad etiladi', (_label, buffer) => {
    expect(detectFileKind(buffer)).toBeNull();
  });
});

describe('LocalDiskStorage (B-022)', () => {
  let root: string;
  let storage: LocalDiskStorage;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'vk-storage-'));
    storage = new LocalDiskStorage(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('tasodifiy nom bilan saqlaydi va /uploads manzilini qaytaradi', async () => {
    const { url } = await storage.save({
      buffer: SAMPLE.jpg,
      folder: 'products',
      extension: 'jpg',
    });

    expect(url).toMatch(/^\/uploads\/products\/[0-9a-f-]{36}\.jpg$/);
    const [file] = await readdir(join(root, 'products'));
    expect(await readFile(join(root, 'products', file))).toEqual(SAMPLE.jpg);
  });

  it('o‘chiradi; fayl allaqachon yo‘q bo‘lsa — xato emas', async () => {
    const { url } = await storage.save({
      buffer: SAMPLE.png,
      folder: 'products',
      extension: 'png',
    });
    await storage.delete(url);
    expect(await readdir(join(root, 'products'))).toEqual([]);
    await expect(storage.delete(url)).resolves.toBeUndefined();
  });

  it('🔒 papkadan tashqariga chiqadigan manzil o‘chirilmaydi', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'vk-outside-'));
    const secret = join(outside, 'secret.txt');
    await writeFile(secret, 'maxfiy');

    try {
      const rel = join('..', outside.split('/').pop()!, 'secret.txt');
      await storage.delete(`/uploads/${rel}`);
      await storage.delete(`/uploads/../../../../${secret}`);
      await storage.delete('/uploads/');
      await storage.delete('https://example.com/a.jpg');

      expect(await readFile(secret, 'utf8')).toBe('maxfiy');
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});
