import { Download, FilePlus2, FileText } from 'lucide-react';
import { useState } from 'react';
import {
  useCreateContract,
  useDownloadContract,
  useMyContracts,
  type Contract,
} from '@/features/cabinet/contracts-api';
import { useCustomerProfile } from '@/features/auth/hooks';
import { errorMessage } from '@/shared/lib/error-message';
import { contractStatusLabel } from '@/shared/lib/labels';
import type { ListParamsConfig } from '@/shared/lib/list-params';
import { useListParams } from '@/shared/lib/use-list-params';
import { Badge, Button, DateText, ErrorState, Modal, Pagination, toast } from '@/shared/ui';

const config: ListParamsConfig<Record<string, string>> = { filterKeys: [] };
const INN_LENGTH = 9;

/**
 * Shartnomalar (D-059) — ro'yxat, INN bo'yicha yangi shartnoma va PDF.
 *
 * ⚠ Didox.uz / E-IMZO nomlari kodda YOZILMAYDI: backend hozircha mock
 *   (api B-045), haqiqiy integratsiya o'z taskida (B-044).
 */
export default function CabinetContractsPage() {
  const list = useListParams(config);
  const contracts = useMyContracts(list.params);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Shartnoma INN bo‘yicha tuziladi. Tayyor fayl PDF ko‘rinishida yuklab olinadi.
        </p>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <FilePlus2 size={16} aria-hidden />
          Yangi shartnoma
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {contracts.error ? (
          <ErrorState error={contracts.error} onRetry={() => void contracts.refetch()} />
        ) : contracts.isPending ? (
          <div aria-hidden className="flex flex-col gap-2 p-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-md bg-surface-muted" />
            ))}
          </div>
        ) : contracts.data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <FileText size={20} className="text-muted" aria-hidden />
            <p className="text-sm text-muted">Hozircha shartnoma yo‘q</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {contracts.data.items.map((contract) => (
                <ContractRow key={contract.id} contract={contract} />
              ))}
            </ul>
            <Pagination
              page={contracts.data.page}
              limit={contracts.data.limit}
              total={contracts.data.total}
              totalPages={contracts.data.totalPages}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
            />
          </>
        )}
      </div>

      <CreateContractModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function ContractRow({ contract }: { contract: Contract }) {
  const download = useDownloadContract();

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium tabular-nums">INN {contract.inn}</p>
        <p className="text-xs text-muted">
          <DateText value={contract.createdAt} />
          {contract.orderNumber && <> · buyurtma {contract.orderNumber}</>}
        </p>
      </div>
      <Badge tone={contract.status === 'SIGNED' ? 'success' : 'neutral'}>
        {contractStatusLabel[contract.status]}
      </Badge>
      <Button
        size="sm"
        pending={download.isPending}
        onClick={() => download.mutate(contract, { onError: toast.error })}
      >
        <Download size={15} aria-hidden />
        PDF
      </Button>
    </li>
  );
}

/**
 * Yangi shartnoma — INN bo'yicha.
 *
 * INN mijoz profilida bo'lsa (admin kiritgan) — maydon shu bilan
 * to'ldiriladi: mijoz o'z raqamini qaytadan yozmasin.
 */
function CreateContractModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useCustomerProfile();
  const [inn, setInn] = useState('');
  const create = useCreateContract();
  const value = inn || profile.data?.inn || '';
  const valid = /^\d{9}$/.test(value);

  const submit = () => {
    if (!valid || create.isPending) return;
    create.mutate(
      { inn: value },
      {
        onSuccess: () => {
          toast.success('Shartnoma yaratildi');
          setInn('');
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        create.reset();
        onClose();
      }}
      dismissible={!create.isPending}
      size="sm"
      title="Yangi shartnoma"
      description="INN bo‘yicha shartnoma tuziladi."
      footer={
        <>
          <Button onClick={onClose} disabled={create.isPending}>
            Bekor qilish
          </Button>
          <Button variant="primary" pending={create.isPending} disabled={!valid} onClick={submit}>
            Yaratish
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1 text-xs text-muted">
        INN ({INN_LENGTH} raqam)
        <input
          inputMode="numeric"
          maxLength={INN_LENGTH}
          value={value}
          onChange={(event) => setInn(event.target.value.replace(/\D/g, ''))}
          placeholder="301234567"
          className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg tabular-nums"
        />
      </label>
      {!valid && value !== '' && (
        <p className="mt-2 text-xs text-danger">INN {INN_LENGTH} raqamdan iborat bo‘ladi</p>
      )}
      {create.error && (
        <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
          {errorMessage(create.error)}
        </p>
      )}
    </Modal>
  );
}
