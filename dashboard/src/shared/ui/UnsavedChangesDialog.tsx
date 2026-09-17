import type { Blocker } from 'react-router';
import { ConfirmDialog } from './ConfirmDialog';

/** `useUnsavedChanges` bloklagan o'tishni tasdiqlash. */
export function UnsavedChangesDialog({ blocker }: { blocker: Blocker }) {
  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      onClose={() => blocker.reset?.()}
      onConfirm={() => blocker.proceed?.()}
      danger
      title="Saqlanmagan o‘zgarishlar bor"
      description="Sahifadan chiqsangiz, kiritilgan o‘zgarishlar yo‘qoladi."
      confirmText="Saqlamasdan chiqish"
      cancelText="Sahifada qolish"
    />
  );
}
