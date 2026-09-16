/** Barcha matnli inputlar uchun bir xil ko'rinish; xatoda qizil chegara. */
export function controlClass(invalid: boolean, extra = ''): string {
  return `w-full rounded-md border bg-surface text-sm placeholder:text-muted/70 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted ${
    invalid ? 'border-danger' : 'border-line-strong'
  } ${extra}`;
}
