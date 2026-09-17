import {
  columnSizingFeature,
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  type ColumnHelper,
  type RowData,
} from '@tanstack/react-table';

/**
 * Jadval xususiyatlari — modul darajasida BIR MARTA (v9 talabi). Sahifalash
 * va saralash SERVERDA: jadval ma'lumotni o'zi tartiblamaydi (G10).
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  columnSizingFeature,
  columnMeta: {} as {
    /** Pul va sonlar — o'ngga */
    align?: 'left' | 'right' | 'center';
    /** Backend `sortBy` qiymati, ustun `id` dan farq qilsa */
    sortKey?: string;
  },
});

export type DataTableFeatures = typeof dataTableFeatures;
/**
 * Ustun turi — kutubxonaning `columns()` yordamchisi qaytaradigan tur: har
 * ustunning qiymat turi (`string`, `boolean`…) har xil bo'lsa ham bitta
 * massivga sig'adi.
 */
export type DataTableColumn<T extends RowData> = ReturnType<
  ColumnHelper<DataTableFeatures, T>['columns']
>[number];

/** Ustunlarni turlar bilan yozish: `const col = tableColumns<Product>(); [col.accessor('name', {...})]` */
export const tableColumns = <T extends RowData>() => createColumnHelper<DataTableFeatures, T>();

