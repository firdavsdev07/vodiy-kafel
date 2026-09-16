import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { errorMessage } from '@/shared/lib/error-message';
import { moveItem } from '@/shared/lib/move-item';
import { useUnsavedChanges } from '@/shared/lib/use-unsaved-changes';
import { Badge, Button, IconButton, toast, UnsavedChangesDialog } from '@/shared/ui';
import { addSimilar, linksToRefs, MAX_SIMILAR, similarChanged, type ProductRef, type SimilarLink } from './similar';
import { ProductSearch } from './ProductSearch';
import { useSetSimilarProducts } from './similar-api';

/**
 * O'xshash mahsulotlar muharriri (D-014). Backend ro'yxatni TO'LIQ
 * almashtiradi — shuning uchun qoralama: qo'shish/olib tashlash/tartib
 * ekranda, "Saqlash" bitta so'rov bilan. Bog'lanish bir tomonlama.
 */
export function SimilarEditor({
  productId,
  saved,
  canWrite,
}: {
  productId: string;
  saved: readonly SimilarLink[];
  canWrite: boolean;
}) {
  const [draft, setDraft] = useState<ProductRef[]>(() => linksToRefs(saved));
  // Serverdagi ro'yxat yangilansa (saqlandi / boshqa tab) — qoralama ham
  const [prevSaved, setPrevSaved] = useState(saved);
  if (prevSaved !== saved) {
    setPrevSaved(saved);
    setDraft(linksToRefs(saved));
  }

  const save = useSetSimilarProducts(productId);
  const dirty = canWrite && similarChanged(draft, saved);
  const { blocker } = useUnsavedChanges(dirty);

  const add = (candidate: ProductRef) => {
    const result = addSimilar(draft, candidate, productId);
    if (result.error) toast.info(result.error);
    else setDraft(result.list);
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">
        Mahsulot sahifasida “Shunga o‘xshash” blokida chiqadi. Bog‘lanish bir tomonlama: A ga B qo‘shilsa, B sahifasida A
        o‘zi paydo bo‘lmaydi. O‘chirilgan mahsulotlar ochiq sahifada ko‘rinmaydi.
      </p>

      {canWrite && (
        <ProductSearch
          onPick={add}
          disabled={draft.length >= MAX_SIMILAR ? `Ko‘pi bilan ${MAX_SIMILAR} ta` : undefined}
          unavailable={(p) => (p.id === productId ? 'shu mahsulot' : draft.some((s) => s.id === p.id) ? 'qo‘shilgan' : null)}
        />
      )}

      <section aria-labelledby="similar-heading" className="flex flex-col gap-2">
        <h3 id="similar-heading" className="text-sm font-medium">
          Tanlanganlar{' '}
          <span className="text-muted tabular-nums">
            ({draft.length}/{MAX_SIMILAR})
          </span>
        </h3>
        {draft.length === 0 ? (
          <p className="rounded-md border border-dashed border-line-strong py-6 text-center text-sm text-muted">
            Hozircha o‘xshash mahsulot tanlanmagan
          </p>
        ) : (
          <ol className="flex flex-col divide-y divide-line rounded-md border border-line">
            {draft.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-5 text-right text-xs text-muted tabular-nums">{i + 1}</span>
                <Link to={`/products/${p.id}`} className={`min-w-0 flex-1 truncate hover:underline ${p.isActive ? '' : 'text-muted'}`}>
                  {p.name}
                </Link>
                {!p.isActive && <Badge tone="neutral">O‘chirilgan</Badge>}
                {canWrite && (
                  <span className="flex gap-0.5">
                    <IconButton label={`${p.name} — yuqoriga`} onClick={() => setDraft(moveItem(draft, i, i - 1))} disabled={i === 0}>
                      <ArrowUp size={14} aria-hidden />
                    </IconButton>
                    <IconButton label={`${p.name} — pastga`} onClick={() => setDraft(moveItem(draft, i, i + 1))} disabled={i === draft.length - 1}>
                      <ArrowDown size={14} aria-hidden />
                    </IconButton>
                    <IconButton label={`${p.name} — olib tashlash`} onClick={() => setDraft(draft.filter((x) => x.id !== p.id))} danger>
                      <X size={14} aria-hidden />
                    </IconButton>
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {canWrite && (
        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
          {dirty && <span className="mr-auto text-sm text-muted">Saqlanmagan o‘zgarishlar bor</span>}
          <Button onClick={() => setDraft(linksToRefs(saved))} disabled={!dirty || save.isPending}>
            Bekor qilish
          </Button>
          <Button
            variant="primary"
            pending={save.isPending}
            disabled={!dirty}
            onClick={() =>
              save.mutate(
                draft.map((p) => p.id),
                {
                  onSuccess: () => toast.success('O‘xshash mahsulotlar saqlandi'),
                  // 400: o'ziga bog'lash / topilmagan ID / dublikat — backend matni
                  onError: (error) => toast.error(errorMessage(error)),
                },
              )
            }
          >
            Saqlash
          </Button>
        </div>
      )}

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
