import { slugify } from './slug.util';

describe('slug.util', () => {
  it('probel va katta harflarni to‘g‘rilaydi', () => {
    expect(slugify('Lyuks Keramogranit 60x60')).toBe(
      'lyuks-keramogranit-60x60',
    );
  });

  it("o'zbekcha apostroflarni (turli belgilar) olib tashlaydi", () => {
    expect(slugify("G'ozg'on zavodi")).toBe('gozgon-zavodi');
    expect(slugify('G’ozg’on zavodi')).toBe('gozgon-zavodi');
  });

  it('ketma-ket bo‘lmagan belgilarni bitta tireга almashtiradi', () => {
    expect(slugify('Kafel — №1 (Farg‘ona)')).toBe('kafel-no1-fargona');
  });

  it('boshi/oxiridagi tirelarni kesadi', () => {
    expect(slugify('  --Test--  ')).toBe('test');
  });
});
