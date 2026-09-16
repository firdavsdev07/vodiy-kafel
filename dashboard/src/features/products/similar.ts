import type { Schema } from '@/shared/api';

export type SimilarLink = Schema<'SimilarProductLinkDto'>;
export type ProductRef = Schema<'ProductAdminRefDto'>;

/** Backend `MAX_SIMILAR` (similar-products.dto.ts). */
export const MAX_SIMILAR = 20;

/**
 * Qoralamaga qo'shish (D-014). Backend baribir tekshiradi (o'ziga bog'lash,
 * dublikat, 20 tadan ko'p — 400), bu yerda — foydalanuvchiga darhol sabab.
 */
export function addSimilar(
  list: readonly ProductRef[],
  candidate: ProductRef,
  selfId: string,
): { list: ProductRef[]; error?: string } {
  if (candidate.id === selfId) return { list: [...list], error: 'Mahsulotni o‘ziga o‘xshash qilib bo‘lmaydi' };
  if (list.some((p) => p.id === candidate.id)) return { list: [...list], error: 'Bu mahsulot ro‘yxatda bor' };
  if (list.length >= MAX_SIMILAR) return { list: [...list], error: `Ko‘pi bilan ${MAX_SIMILAR} ta o‘xshash mahsulot` };
  return { list: [...list, candidate] };
}

/** Saqlangan ro'yxatdan farqi bormi (tartib ham hisobga olinadi). */
export function similarChanged(draft: readonly ProductRef[], saved: readonly SimilarLink[]): boolean {
  const savedIds = [...saved].sort((a, b) => a.sortOrder - b.sortOrder).map((l) => l.product.id);
  return draft.length !== savedIds.length || draft.some((p, i) => p.id !== savedIds[i]);
}

export function linksToRefs(links: readonly SimilarLink[]): ProductRef[] {
  return [...links].sort((a, b) => a.sortOrder - b.sortOrder).map((l) => l.product);
}
