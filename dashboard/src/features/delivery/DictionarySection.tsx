import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api';
import { errorMessage } from '@/shared/lib/error-message';
import { Badge, Button, ConfirmDialog, ErrorState, FilterBar, FilterSelect, IconButton, InputField, Modal, PageLoading, toast } from '@/shared/ui';
import {
  dictionaryDefaults,
  dictionarySchema,
  nextSortOrder,
  toCreateDictionaryBody,
  toUpdateDictionaryBody,
  type DictionaryBody,
  type DictionaryFormInput,
  type DictionaryFormValues,
  type DictionaryItem,
} from './dictionary';

type Mutation<V> = {
  mutate: (vars: V, options?: { onSuccess?: () => void; onError?: (e: Error) => void }) => void;
  isPending: boolean;
  error: Error | null;
  reset: () => void;
};

export interface DictionaryTexts {
  /** "Viloyat" */
  singular: string;
  addLabel: string;
  empty: string;
  deactivateHint: string;
}

const activeOptions = [
  { value: 'true', label: 'Faol' },
  { value: 'false', label: 'O‘chirilgan' },
] as const;

/**
 * Yetkazib berish ma'lumotnomasi (D-037 viloyatlar, D-038 transport turlari).
 * Ro'yxat (tartib bo'yicha), qo'shish, tahrirlash, o'chirish (soft) va
 * qaytarish. 🔒 `canWrite` — faqat SUPER_ADMIN; boshqalar faqat ko'radi.
 */
export function DictionarySection({
  texts,
  query,
  filter,
  onFilterChange,
  canWrite,
  withCapacity,
  nameMax,
  create,
  update,
  deactivate,
}: {
  texts: DictionaryTexts;
  query: { data?: DictionaryItem[]; isPending: boolean; error: unknown; isFetching: boolean; refetch: () => unknown };
  filter: string | undefined;
  onFilterChange: (value: string | undefined) => void;
  canWrite: boolean;
  withCapacity: boolean;
  nameMax: number;
  create: Mutation<DictionaryBody>;
  update: Mutation<{ id: string; body: DictionaryBody & { isActive?: boolean } }>;
  deactivate: Mutation<string>;
}) {
  const [editing, setEditing] = useState<DictionaryItem | 'new' | null>(null);
  const [toggling, setToggling] = useState<DictionaryItem | null>(null);
  const items = query.data ?? [];

  const resetToggle = () => {
    setToggling(null);
    deactivate.reset();
    update.reset();
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <FilterBar
        hasFilters={filter !== undefined}
        onReset={() => onFilterChange(undefined)}
        actions={
          canWrite && (
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Plus size={16} aria-hidden />
              {texts.addLabel}
            </Button>
          )
        }
      >
        <FilterSelect label="Holat" value={filter} onChange={onFilterChange} options={activeOptions} />
      </FilterBar>

      {query.isPending ? (
        <PageLoading />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">{filter ? 'Filtrga mos yozuv yo‘q' : texts.empty}</p>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">{texts.singular} ro‘yxati</caption>
          <thead className="text-xs text-muted">
            <tr className="border-b border-line">
              <th scope="col" className="w-16 px-4 py-2 text-right font-medium">Tartib</th>
              <th scope="col" className="px-4 py-2 text-left font-medium">Nomi</th>
              {withCapacity && <th scope="col" className="px-4 py-2 text-right font-medium">Sig‘imi</th>}
              <th scope="col" className="px-4 py-2 text-left font-medium">Holat</th>
              {canWrite && <th scope="col" className="px-4 py-2"><span className="sr-only">Amallar</span></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 text-right text-muted tabular-nums">{item.sortOrder}</td>
                <td className={`px-4 py-2.5 font-medium ${item.isActive ? '' : 'text-muted'}`}>{item.name}</td>
                {withCapacity && <td className="px-4 py-2.5 text-right tabular-nums">{item.capacityPallets} paddon</td>}
                <td className="px-4 py-2.5">{item.isActive ? <Badge tone="success">Faol</Badge> : <Badge tone="neutral">O‘chirilgan</Badge>}</td>
                {canWrite && (
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <IconButton label={`${item.name} — tahrirlash`} onClick={() => setEditing(item)}>
                        <Pencil size={15} aria-hidden />
                      </IconButton>
                      <IconButton
                        label={item.isActive ? `${item.name} — o‘chirish` : `${item.name} — qaytarish`}
                        onClick={() => setToggling(item)}
                        danger={item.isActive}
                      >
                        {item.isActive ? <Trash2 size={15} aria-hidden /> : <RotateCcw size={15} aria-hidden />}
                      </IconButton>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canWrite && (
        <>
          <DictionaryFormModal
            open={editing !== null}
            item={editing === 'new' || editing === null ? undefined : editing}
            texts={texts}
            withCapacity={withCapacity}
            nameMax={nameMax}
            nextSortOrder={nextSortOrder(items)}
            create={create}
            update={update}
            onClose={() => setEditing(null)}
          />
          {toggling && (
            <ConfirmDialog
              open
              onClose={resetToggle}
              danger={toggling.isActive}
              title={toggling.isActive ? `“${toggling.name}” ni o‘chirish?` : `“${toggling.name}” ni qaytarish?`}
              description={toggling.isActive ? texts.deactivateHint : 'Yana tanlovda ko‘rinadi va hisobda ishlatiladi.'}
              confirmText={toggling.isActive ? 'O‘chirish' : 'Qaytarish'}
              pending={deactivate.isPending || update.isPending}
              error={deactivate.error ? errorMessage(deactivate.error) : update.error ? errorMessage(update.error) : undefined}
              onConfirm={() => {
                const onSuccess = () => {
                  toast.success(toggling.isActive ? `“${toggling.name}” o‘chirildi` : `“${toggling.name}” qaytarildi`);
                  resetToggle();
                };
                if (toggling.isActive) deactivate.mutate(toggling.id, { onSuccess });
                else update.mutate({ id: toggling.id, body: { isActive: true } }, { onSuccess });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

const FORM_ID = 'dictionary-form';

function DictionaryFormModal({
  open,
  item,
  texts,
  withCapacity,
  nameMax,
  nextSortOrder: next,
  create,
  update,
  onClose,
}: {
  open: boolean;
  item?: DictionaryItem;
  texts: DictionaryTexts;
  withCapacity: boolean;
  nameMax: number;
  nextSortOrder: number;
  create: Mutation<DictionaryBody>;
  update: Mutation<{ id: string; body: DictionaryBody }>;
  onClose: () => void;
}) {
  const pending = create.isPending || update.isPending;
  const close = () => {
    create.reset();
    update.reset();
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!pending}
      size="sm"
      title={item ? `${item.name} — tahrirlash` : texts.addLabel}
      description={withCapacity && item ? 'Sig‘im o‘zgarsa — faqat yangi hisoblarga ta’sir qiladi; eski buyurtmalardagi transport soni o‘zgarmaydi.' : undefined}
      footer={
        <>
          <Button onClick={close} disabled={pending}>
            Bekor qilish
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} pending={pending}>
            Saqlash
          </Button>
        </>
      }
    >
      {open && (
        <DictionaryForm key={item?.id ?? 'new'} item={item} withCapacity={withCapacity} nameMax={nameMax} next={next} create={create} update={update} onDone={close} />
      )}
    </Modal>
  );
}

function DictionaryForm({
  item,
  withCapacity,
  nameMax,
  next,
  create,
  update,
  onDone,
}: {
  item?: DictionaryItem;
  withCapacity: boolean;
  nameMax: number;
  next: number;
  create: Mutation<DictionaryBody>;
  update: Mutation<{ id: string; body: DictionaryBody }>;
  onDone: () => void;
}) {
  const pending = create.isPending || update.isPending;
  const form = useForm<DictionaryFormInput, unknown, DictionaryFormValues>({
    resolver: zodResolver(dictionarySchema({ nameMax, withCapacity })),
    defaultValues: dictionaryDefaults(item, next),
  });

  const onError = (error: Error) => {
    // 409 — nom band (noyob)
    if (error instanceof ApiError && error.statusCode === 409) {
      form.setError('name', { message: errorMessage(error) }, { shouldFocus: true });
    } else if (error instanceof ApiError && [400, 404].includes(error.statusCode)) {
      form.setError('root', { message: errorMessage(error) });
    } else toast.error(error);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (pending) return;
    if (!item) {
      create.mutate(toCreateDictionaryBody(values), {
        onSuccess: () => {
          toast.success(`“${values.name}” qo‘shildi`);
          onDone();
        },
        onError,
      });
      return;
    }
    const body = toUpdateDictionaryBody(values, item);
    if (Object.keys(body).length === 0) return onDone();
    update.mutate(
      { id: item.id, body },
      {
        onSuccess: () => {
          toast.success('O‘zgarishlar saqlandi');
          onDone();
        },
        onError,
      },
    );
  });

  return (
    <form id={FORM_ID} noValidate onSubmit={onSubmit} aria-busy={pending || undefined}>
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <InputField control={form.control} name="name" label="Nomi" required maxLength={nameMax} autoComplete="off" className="sm:col-span-2" />
        {withCapacity && (
          <InputField control={form.control} name="capacityPallets" label="Sig‘imi, paddon" required inputMode="numeric" hint="Bitta transportga sig‘adigan paddon" />
        )}
        <InputField control={form.control} name="sortOrder" label="Tartib" required inputMode="numeric" />
      </fieldset>
      {form.formState.errors.root && (
        <p role="alert" className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
          {form.formState.errors.root.message}
        </p>
      )}
    </form>
  );
}
