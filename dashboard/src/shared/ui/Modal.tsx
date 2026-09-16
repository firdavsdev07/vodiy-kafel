import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Modal (D-008) — native `<dialog>`: fokus tuzog'i, Esc, fon `inert` —
 * brauzerning o'zida. Yopilganda fokus ochgan tugmaga qaytadi. Boshlang'ich
 * fokus — `data-autofocus` belgilangan element (React `autoFocus` bu yerda ishlamaydi).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** `false` — so'rov ketayotganda Esc/fon bosish yopmaydi. */
  dismissible?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const ids = { title: useId(), description: useId() };

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal fokusni birinchi tugmaga (X) qo'yadi; `data-autofocus` bo'lsa — o'shanga
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' }[size];

  return (
    <dialog
      ref={ref}
      aria-labelledby={ids.title}
      aria-describedby={description ? ids.description : undefined}
      // Esc: brauzer o'zi yopadi — holatni React bilan tenglashtiramiz
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      // Fon (dialog elementining o'zi) bosilsa
      onClick={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
      className={`m-auto w-[calc(100vw-2rem)] ${width} rounded-lg border border-line bg-surface p-0 text-fg shadow-md backdrop:bg-ink/50`}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={ids.title} className="text-md font-semibold">
                {title}
              </h2>
              {description && (
                <div id={ids.description} className="mt-1 text-sm text-muted">
                  {description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={!dismissible}
              aria-label="Yopish"
              className="rounded-sm text-muted hover:text-fg disabled:opacity-40"
            >
              <X size={18} aria-hidden />
            </button>
          </header>
          {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
          {footer && (
            <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>
          )}
        </div>
      )}
    </dialog>
  );
}
