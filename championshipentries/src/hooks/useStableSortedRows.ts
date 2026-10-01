import { useEffect, useMemo, useRef, useState } from "react";
import type { GridColDef, GridRowId, GridSortModel } from "@mui/x-data-grid";
import { DUMMY_SORT_CELL_PARAMS, defaultValueComparator } from "../utils/dataGridCells";

function sortStorageKey(storageKey: string): string {
  return `gridSort:${storageKey}`;
}

function readStoredSortModel(storageKey: string): GridSortModel {
  try {
    const raw = localStorage.getItem(sortStorageKey(storageKey));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as GridSortModel) : [];
  } catch {
    return [];
  }
}

/**
 * Row order while unsorted always tracks `rows`' own array order as-is — so
 * actions that genuinely change that order (add, delete, drag-to-reorder)
 * show up immediately. While a column sort is active, order is frozen except
 * when the sort column/direction changes or rows are added/removed, never
 * just because an edited value would otherwise reshuffle the sorted column —
 * that reshuffling mid-edit is disorienting (e.g. a row jumping away from
 * the cursor right after typing into it). Pair with `sortingMode="server"`
 * on the DataGrid to hand row ordering entirely to this hook instead of
 * DataGrid's own (order-follows-every-render) client sort.
 *
 * When the sort column changes, the new sort is applied on top of the
 * currently displayed order (not the raw `rows` order) so that rows tied
 * under the new column keep their relative order from the previous sort —
 * e.g. sorting by first name then by last name still breaks last-name ties
 * by first name, since `Array.prototype.sort` is stable.
 *
 * When `storageKey` is given, the chosen sort column/direction is persisted
 * to localStorage and restored on the next page load (tie order itself
 * isn't persisted — it's rebuilt from `rows`' order the first time the
 * restored sort is applied, same as a fresh in-session sort).
 */
export function useStableSortedRows<T extends { id: string }>(
  rows: T[],
  allColumns: GridColDef<T>[],
  storageKey?: string,
) {
  const [sortModel, setSortModel] = useState<GridSortModel>(() =>
    storageKey ? readStoredSortModel(storageKey) : [],
  );

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(sortStorageKey(storageKey), JSON.stringify(sortModel));
  }, [storageKey, sortModel]);

  const orderRef = useRef<GridRowId[]>([]);
  const lastOrderKeyRef = useRef<string | null>(null);
  const displayRows = useMemo(() => {
    const rowById = new Map<GridRowId, T>(rows.map((row) => [row.id, row]));
    const sortItem = sortModel[0];
    if (!sortItem || !sortItem.sort) {
      orderRef.current = rows.map((row) => row.id);
      lastOrderKeyRef.current = null;
    } else {
      const idsKey = rows
        .map((row) => row.id)
        .slice()
        .sort()
        .join(" ");
      const orderKey = `${idsKey}|${JSON.stringify(sortModel)}`;
      if (orderKey !== lastOrderKeyRef.current) {
        const column = allColumns.find((c) => c.field === sortItem.field);
        const comparator = column?.sortComparator ?? defaultValueComparator;
        const direction = sortItem.sort === "desc" ? -1 : 1;
        const existingIds = new Set(orderRef.current);
        const newIds = rows.map((row) => row.id).filter((id) => !existingIds.has(id));
        const baseOrder = [...orderRef.current.filter((id) => rowById.has(id)), ...newIds];
        orderRef.current = baseOrder.sort((a, b) => {
          const va = (rowById.get(a) as Record<string, unknown> | undefined)?.[sortItem.field];
          const vb = (rowById.get(b) as Record<string, unknown> | undefined)?.[sortItem.field];
          return direction * comparator(va, vb, DUMMY_SORT_CELL_PARAMS, DUMMY_SORT_CELL_PARAMS);
        });
        lastOrderKeyRef.current = orderKey;
      }
    }
    return orderRef.current.map((id) => rowById.get(id)).filter((row): row is T => row != null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortModel]);

  return { sortModel, setSortModel, displayRows };
}
