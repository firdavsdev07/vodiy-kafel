import { describe, expect, it } from 'vitest';
import { addSimilar, linksToRefs, MAX_SIMILAR, similarChanged, type ProductRef } from './similar';

const ref = (id: string): ProductRef => ({ id, name: id, slug: id, isActive: true });

describe('o‘xshash mahsulotlar (D-014)', () => {
  it('qo‘shish: o‘ziga, dublikat, chegara', () => {
    expect(addSimilar([], ref('a'), 'self').list.map((p) => p.id)).toEqual(['a']);
    expect(addSimilar([], ref('self'), 'self').error).toMatch(/o‘ziga/);
    expect(addSimilar([ref('a')], ref('a'), 'self').error).toMatch(/bor/);
    const full = Array.from({ length: MAX_SIMILAR }, (_, i) => ref(`p${i}`));
    const res = addSimilar(full, ref('x'), 'self');
    expect(res.error).toMatch(/20/);
    expect(res.list).toHaveLength(MAX_SIMILAR);
  });

  it('o‘zgarish: tarkib ham, tartib ham', () => {
    const saved = [
      { product: ref('b'), sortOrder: 1 },
      { product: ref('a'), sortOrder: 0 },
    ];
    expect(linksToRefs(saved).map((p) => p.id)).toEqual(['a', 'b']);
    expect(similarChanged([ref('a'), ref('b')], saved)).toBe(false);
    expect(similarChanged([ref('b'), ref('a')], saved)).toBe(true);
    expect(similarChanged([ref('a')], saved)).toBe(true);
  });
});
