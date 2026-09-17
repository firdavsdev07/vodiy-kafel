import { ImagePlus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { ACCEPT, formatBytes } from './media';

/**
 * Bitta rasm tanlash (drag & drop yoki tanlash oynasi) — yubormasdan oldin
 * ko'rinishi bilan. Galereya (D-015) va hamkor logotipi (D-034).
 * ⚠ `accept` — faqat qulaylik; haqiqiy tur tekshiruvi BACKENDDA (fayl mazmuni).
 */
export function ImageFilePicker({
  id,
  file,
  error,
  disabled,
  onPick,
  onClear,
}: {
  id: string;
  file: File | null;
  error: string | null;
  disabled: boolean;
  onPick: (f: File | undefined) => void;
  onClear: () => void;
}) {
  // Tanlangan faylni yubormasdan ko'rsatish; eski URL xotirada qolmasin
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled) onPick(e.dataTransfer.files[0]);
        }}
        className={`relative flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 border-dashed text-center text-sm ${
          error ? 'border-danger' : 'border-line-strong'
        }`}
      >
        {url ? (
          <img src={url} alt="Tanlangan rasm" className="max-h-56 w-full object-contain" />
        ) : (
          <>
            <ImagePlus size={22} className="text-muted" aria-hidden />
            <span>
              Rasmni shu yerga tashlang yoki <span className="font-medium underline underline-offset-2">tanlang</span>
            </span>
          </>
        )}
        <input
          id={id}
          type="file"
          accept={ACCEPT.IMAGE}
          disabled={disabled}
          className="sr-only"
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      {file && (
        <p className="flex items-center gap-2 text-xs text-muted">
          <span className="truncate">
            {file.name} · {formatBytes(file.size)}
          </span>
          <button type="button" onClick={onClear} disabled={disabled} className="underline">
            boshqa rasm
          </button>
        </p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
