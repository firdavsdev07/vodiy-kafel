import { zodResolver } from '@hookform/resolvers/zod';
import { Info, X } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ApiError } from '@/shared/api';
import { useFactories } from '@/features/factories/api';
import { ProductSearch } from '@/features/products/ProductSearch';
import { useBranchTariffs } from './tariffs-api';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, InputField, Modal, SelectField, toast, type SelectOption } from '@/shared/ui';
import { useCreatePricingRule } from './api';
import {
  domainLabel,
  needsTarget,
  ruleDefaults,
  ruleSchema,
  scopeLabel,
  SCOPES_BY_DOMAIN,
  targetKind,
  toCreateBody,
  typeLabel,
  type DiscountLimit,
  type PricingDomain,
  type RuleFormValues,
} from './pricing-rules';

const FORM_ID = 'pricing-rule-form';

/**
 * Yangi narx qoidasi (D-019). Qoida TAHRIRLANMAYDI — backend faqat
 * qo'shish va o'chirishni biladi ("o'chirib, yangisini qo'shing").
 */
export function AddRuleModal({
  open,
  customerId,
  customerName,
  branchId,
  limit,
  onClose,
}: {
  open: boolean;
  customerId: string;
  customerName: string;
  /** Mijoz filiali — `scope=ROUTE` da tariflar shu filialdan olinadi. */
  branchId: string;
  limit: DiscountLimit;
  onClose: () => void;
}) {
  const create = useCreatePricingRule(customerId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!create.isPending}
      size="md"
      title="Yangi narx qoidasi"
      description={`“${customerName}” uchun. Qoida tahrirlanmaydi — kerak bo‘lsa o‘chirib, yangisini qo‘shasiz.`}
      footer={
        <>
          <Button onClick={onClose} disabled={create.isPending}>
            Bekor qilish
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} pending={create.isPending}>
            Qo‘shish
          </Button>
        </>
      }
    >
      {open && (
        <RuleForm
          branchId={branchId}
          limit={limit}
          create={create}
          onDone={onClose}
        />
      )}
    </Modal>
  );
}

function RuleForm({
  branchId,
  limit,
  create,
  onDone,
}: {
  branchId: string;
  limit: DiscountLimit;
  create: ReturnType<typeof useCreatePricingRule>;
  onDone: () => void;
}) {
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema({ limit })),
    defaultValues: ruleDefaults(limit),
  });
  const [domain, scope, type] = useWatch({ control: form.control, name: ['domain', 'scope', 'type'] });
  // Tanlangan mahsulot: `scopeId` formada, NOMI esa shu yerda — `ProductSearch`
  // nomni faqat tanlash payti beradi, keyin ro'yxat yopiladi.
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);

  const kind = targetKind(scope);
  const factories = useFactories();
  const tariffs = useBranchTariffs(branchId, kind === 'tariff');

  const onSubmit = form.handleSubmit((values) => {
    if (create.isPending) return;
    create.mutate(toCreateBody(values), {
      onSuccess: () => {
        toast.success('Qoida qo‘shildi');
        onDone();
      },
      onError: (error: unknown) => {
        if (error instanceof ApiError && error.statusCode < 500) {
          form.setError('root', { message: errorMessage(error) });
        } else {
          toast.error(error);
        }
      },
    });
  });

  const domainOptions: SelectOption[] = Object.entries(domainLabel).map(([value, label]) => ({ value, label }));
  const scopeOptions: SelectOption[] = SCOPES_BY_DOMAIN[domain].map((s) => ({ value: s, label: scopeLabel[s] }));
  const typeOptions: SelectOption[] = Object.entries(typeLabel).map(([value, label]) => ({
    value,
    label,
    // Filial admini faqat foiz bilan ishlaydi — sababi hint'da
    disabled: Boolean(limit) && value !== 'PERCENT',
  }));

  return (
    <form id={FORM_ID} noValidate onSubmit={onSubmit} aria-busy={create.isPending || undefined} className="flex flex-col gap-4">
      <fieldset disabled={create.isPending} className="grid gap-4 sm:grid-cols-2">
        <SelectField
          control={form.control}
          name="domain"
          label="Nimaga"
          required
          options={domainOptions}
          onValueChange={(next) => {
            // TRANSPORT da PRODUCT doirasi yo'q — eski tanlov yaroqsiz
            // bo'lib qolmasin uchun birinchi ruxsat etilganiga o'tkazamiz.
            const allowed = SCOPES_BY_DOMAIN[next as PricingDomain];
            form.setValue('scope', allowed[0], { shouldValidate: false });
            form.setValue('scopeId', '');
            setPicked(null);
          }}
        />
        <SelectField
          control={form.control}
          name="scope"
          label="Qanchalik aniq"
          required
          options={scopeOptions}
          onValueChange={() => {
            // Doira almashdi — eski nishon (mahsulot/zavod/yo'nalish) endi mos emas
            form.setValue('scopeId', '');
            setPicked(null);
          }}
        />
      </fieldset>

      {needsTarget(scope) && (
        <div className="flex flex-col gap-1.5">
          {kind === 'product' && (
            <ProductPicker
              picked={picked}
              onPick={(product) => {
                setPicked(product);
                form.setValue('scopeId', product.id, { shouldValidate: true });
              }}
              onClear={() => {
                setPicked(null);
                form.setValue('scopeId', '', { shouldValidate: true });
              }}
              error={form.formState.errors.scopeId?.message}
              disabled={create.isPending}
            />
          )}
          {kind === 'factory' && (
            <SelectField
              control={form.control}
              name="scopeId"
              label="Zavod"
              required
              options={(factories.data ?? []).map((f) => ({ value: f.id, label: f.name }))}
              placeholder={factories.isPending ? 'Yuklanmoqda…' : 'Zavodni tanlang…'}
            />
          )}
          {kind === 'tariff' && (
            <SelectField
              control={form.control}
              name="scopeId"
              label="Yo‘nalish"
              required
              hint="Mijoz filialining tariflari — viloyat × transport turi"
              options={(tariffs.data?.items ?? []).map((t) => ({
                value: t.id,
                label: `${t.region.name} · ${t.transportType.name}`,
              }))}
              placeholder={tariffs.isPending ? 'Yuklanmoqda…' : 'Yo‘nalishni tanlang…'}
            />
          )}
        </div>
      )}

      <fieldset disabled={create.isPending} className="grid gap-4 sm:grid-cols-2">
        <SelectField
          control={form.control}
          name="type"
          label="Qanday"
          required
          options={typeOptions}
          hint={limit ? 'Siz faqat foizli chegirma bera olasiz' : undefined}
        />
        <InputField
          control={form.control}
          name="value"
          label={type === 'PERCENT' ? 'Foiz' : 'Narx, so‘m'}
          required
          inputMode={type === 'PERCENT' ? 'text' : 'numeric'}
          autoComplete="off"
          hint={
            type === 'PERCENT'
              ? limit
                ? `Chegirma: manfiy son, ${limit.maxDiscountPercent}% gacha (masalan −10)`
                : '−10 — chegirma, 5 — ustama'
              : 'Bazaviy narx o‘rniga aynan shu summa (1 m² uchun)'
          }
        />
      </fieldset>

      {form.formState.errors.root && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
          {form.formState.errors.root.message}
        </p>
      )}

      <p className="flex gap-2 rounded-md bg-info-soft px-3 py-2 text-xs text-info">
        <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Bir nechta qoida mos kelsa — <strong>eng aniqrog‘i</strong> ishlaydi. Mijoz faqat yakuniy narxni
          ko‘radi, qaysi qoida ishlagani unga ko‘rinmaydi.
        </span>
      </p>
    </form>
  );
}

/** Mahsulotni qidirib tanlash — tanlangani chipda ko'rinadi. */
function ProductPicker({
  picked,
  onPick,
  onClear,
  error,
  disabled,
}: {
  picked: { id: string; name: string } | null;
  onPick: (product: { id: string; name: string }) => void;
  onClear: () => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        Mahsulot <span className="text-danger">*</span>
      </span>
      {picked ? (
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-line-strong bg-surface-muted px-3 py-1.5 text-sm">
          {picked.name}
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label="Mahsulotni bekor qilish"
            className="text-muted hover:text-fg"
          >
            <X size={14} aria-hidden />
          </button>
        </span>
      ) : (
        <ProductSearch onPick={(p) => onPick({ id: p.id, name: p.name })} pickLabel="Tanlash" />
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
