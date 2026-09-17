import { describe, expect, it } from 'vitest';
import { resolveAssetUrl } from './asset-url';

const api = 'https://api.vodiykafel.uz/api/v1';

describe('resolveAssetUrl', () => {
  it('/uploads → API origin (global prefikssiz)', () => {
    expect(resolveAssetUrl('/uploads/factories/a.png', api)).toBe(
      'https://api.vodiykafel.uz/uploads/factories/a.png',
    );
  });

  it('tashqi havola o‘zgarmaydi; bo‘sh va xavfli qiymat → undefined', () => {
    expect(resolveAssetUrl('https://cdn.x/a.png', api)).toBe('https://cdn.x/a.png');
    expect(resolveAssetUrl('', api)).toBeUndefined();
    expect(resolveAssetUrl(null, api)).toBeUndefined();
    expect(resolveAssetUrl('javascript:alert(1)', api)).toBeUndefined();
    expect(resolveAssetUrl('logo.png', api)).toBeUndefined();
  });
});
