import { useMemo, useRef, useState } from "react";
import type { GridColDef, GridRowId, GridSortModel } from "@mui/x-data-grid";
import { DUMMY_SORT_CELL_PARAMS, defaultValueComparator } from "../utils/dataGridCells";

/**
 * Row order is frozen across edits: sorting only re-runs when the sort
 * column/direction changes or when rows are added/removed, never just
 * because an edited value would otherwise reshuffle the sorted column —
 * that reshuffling mid-edit is disorienting (e.g. a row jumping away from
 * the cursor right after typing into it). Pair with `sortingMode="server"`
 * on the DataGrid to hand row ordering entirely to this hook instead of
 * DataGrid's own (order-follows-every-render) client sort.
 */
export function useStableSortedRows<T extends { id: string }>(
  rows: T[],
  allColumns: GridColDef<T>[],
) {
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const orderRef = useRef<GridRowId[]>([]);
  const lastOrderKeyRef = useRef<string | null>(null);
  const displayRows = useMemo(() => {
    const rowById = new Map<GridRowId, T>(rows.map((row) => [row.id, row]));
    const idsKey = rows
      .map((row) => row.id)
      .slice()
      .sort()
      .join(" ");
    const orderKey = `${idsKey}|${JSON.stringify(sortModel)}`;
    if (orderKey !== lastOrderKeyRef.current) {
      let ids = rows.map((row) => row.id);
      const sortItem = sortModel[0];
      if (sortItem && sortItem.sort) {
        const column = allColumns.find((c) => c.field === sortItem.field);
        const comparator = column?.sortComparator ?? defaultValueComparator;
        const direction = sortItem.sort === "desc" ? -1 : 1;
        ids = ids.slice().sort((a, b) => {
          const va = (rowById.get(a) as Record<string, unknown> | undefined)?.[sortItem.field];
          const vb = (rowById.get(b) as Record<string, unknown> | undefined)?.[sortItem.field];
          return direction * comparator(va, vb, DUMMY_SORT_CELL_PARAMS, DUMMY_SORT_CELL_PARAMS);
        });
      }
      orderRef.current = ids;
      lastOrderKeyRef.current = orderKey;
    }
    return orderRef.current.map((id) => rowById.get(id)).filter((row): row is T => row != null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortModel]);

  return { sortModel, setSortModel, displayRows };
}
