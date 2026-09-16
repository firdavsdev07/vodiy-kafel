import { AlertTriangle } from 'lucide-react';
import { errorMessage, errorRequestId } from '@/shared/lib/error-message';
import { Button } from './Button';

/**
 * Xato holati (D-008): `ApiError` → tushunarli matn + `requestId`
 * (qo'llab-quvvatlash server logidan so'rovni topadi) + qayta urinish.
 */
export function ErrorState({
  error,
  onRetry,
  retrying = false,
  compact = false,
}: {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
}) {
  const requestId = errorRequestId(error);
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 text-center ${compact ? 'py-8' : 'min-h-64 p-8'}`}
    >
      <AlertTriangle size={20} className="text-danger" aria-hidden />
      <p className="max-w-md whitespace-pre-line text-sm">{errorMessage(error)}</p>
      {requestId && (
        <p className="text-xs text-muted">
          So‘rov ID: <code className="font-mono select-all">{requestId}</code>
        </p>
      )}
      {onRetry && (
        <Button size="sm" onClick={onRetry} pending={retrying}>
          Qayta urinish
        </Button>
      )}
    </div>
  );
}
