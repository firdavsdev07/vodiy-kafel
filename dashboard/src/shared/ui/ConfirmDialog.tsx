import type { ReactNode } from 'react';
import { commonText } from '@/shared/lib/labels';
import { Button } from './Button';
import { Modal } from './Modal';

/**
 * Tasdiq (D-008). O'chirish va qaytarib bo'lmaydigan amal HAR DOIM shu
 * orqali. So'rov ketayotganda yopilmaydi va tugma qayta bosilmaydi.
 * Xato bo'lsa dialog ochiq qoladi — `error` bilan sabab ko'rsatiladi.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = commonText.confirm,
  cancelText = commonText.cancel,
  danger = false,
  pending = false,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  pending?: boolean;
  error?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      dismissible={!pending}
      footer={
        <>
          {/* Xavfli amalda Enter tasodifan tasdiqlamasin — fokus "Bekor qilish" da */}
          <Button onClick={onClose} disabled={pending} data-autofocus>
            {cancelText}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} pending={pending}>
            {confirmText}
          </Button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
