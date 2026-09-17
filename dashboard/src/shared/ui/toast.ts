import { errorMessage, errorRequestId } from '@/shared/lib/error-message';
import { createToastStore } from './toast-store';

export const toastStore = createToastStore();

/**
 * Muvaffaqiyat / xato xabari (D-008). React'dan tashqarida ham ishlaydi:
 *   useMutation({ onSuccess: () => toast.success('Saqlandi'), onError: toast.error })
 */
export const toast = {
  success: (message: string) => toastStore.push('success', message),
  info: (message: string) => toastStore.push('info', message),
  /** `ApiError` ham, oddiy matn ham — matn `errorMessage` dan, `requestId` saqlanadi. */
  error: (error: unknown) =>
    typeof error === 'string'
      ? toastStore.push('error', error)
      : toastStore.push('error', errorMessage(error), errorRequestId(error)),
};
