import { describe, expect, it } from 'vitest';
import { moveItem } from '@/shared/lib/move-item';
import { formatBytes, guessType, MAX_UPLOAD_BYTES, precheckFile } from './media';

const file = (type: string, size = 1000) => ({ type, size }) as File;

describe('media (D-013)', () => {
  it('oldindan tekshiruv: hajm va aniq nomuvofiqlik', () => {
    expect(precheckFile(file('image/png'), 'IMAGE')).toBeNull();
    expect(precheckFile(file('image/png', MAX_UPLOAD_BYTES + 1), 'IMAGE')).toMatch(/10 MB dan katta/);
    expect(precheckFile(file('image/png', 0), 'IMAGE')).toMatch(/bo‘sh/);
    expect(precheckFile(file('image/jpeg'), 'VIDEO_360')).toMatch(/MP4/);
    expect(precheckFile(file('video/mp4'), 'IMAGE_360')).toMatch(/360° video/);
    // Kengaytma/MIME yolg'on bo'lishi mumkin — noma'lum turni backend hal qiladi
    expect(precheckFile(file(''), 'IMAGE')).toBeNull();
  });

  it('tur taxmini', () => {
    expect(guessType(file('video/mp4'), 'IMAGE')).toBe('VIDEO_360');
    expect(guessType(file('image/png'), 'VIDEO_360')).toBe('IMAGE');
    expect(guessType(file('image/png'), 'IMAGE_360')).toBe('IMAGE_360');
  });

  it('moveItem', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
    const src = ['a', 'b'];
    expect(moveItem(src, 0, 1)).not.toBe(src);
  });

  it('formatBytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3.45 * 1024 * 1024)).toBe('3,5 MB');
  });
});
