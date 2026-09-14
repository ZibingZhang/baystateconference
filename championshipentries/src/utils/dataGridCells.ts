import type { GridApiCommon, GridRowId, GridSortCellParams } from "@mui/x-data-grid";

const CELL_KEY_SEP = " ";
export const cellKey = (id: GridRowId, field: string) => `${id}${CELL_KEY_SEP}${field}`;
export const parseCellKey = (key: string): CellRef => {
  const sepIndex = key.lastIndexOf(CELL_KEY_SEP);
  return { id: key.slice(0, sepIndex), field: key.slice(sepIndex + 1) };
};

export interface CellRef {
  id: GridRowId;
  field: string;
}

export function defaultValueComparator(v1: unknown, v2: unknown): number {
  if (typeof v1 === "number" && typeof v2 === "number") return v1 - v2;
  return String(v1 ?? "").localeCompare(String(v2 ?? ""));
}

// Our comparators (default and column-supplied) only look at v1/v2, never the
// cell params — these placeholders satisfy GridComparatorFn's signature without
// needing real GridSortCellParams (which require a live rowNode/api).
export const DUMMY_SORT_CELL_PARAMS = {} as GridSortCellParams;

export function selectableFields(api: GridApiCommon): string[] {
  return api
    .getAllColumns()
    .filter((c) => c.field !== "actions")
    .map((c) => c.field);
}

/**
 * Excel/Sheets-style Ctrl+Arrow: from `startIndex`, walks toward `step` and
 * stops at the last non-empty cell before a gap, or at the far edge of the
 * row/column, whichever comes first. If the next cell is empty (or the start
 * cell is), it instead skips the gap to land on the next non-empty cell (or
 * the edge, if there isn't one). Works for either a column (walking rows) or
 * a row (walking columns) — the caller supplies `isEmptyAt` accordingly.
 */
export function findBlockEdgeIndex(
  isEmptyAt: (index: number) => boolean,
  length: number,
  startIndex: number,
  step: number,
): number {
  const next = startIndex + step;
  if (next < 0 || next >= length) return startIndex;
  if (!isEmptyAt(startIndex) && !isEmptyAt(next)) {
    let idx = startIndex;
    let probe = next;
    while (probe >= 0 && probe < length && !isEmptyAt(probe)) {
      idx = probe;
      probe += step;
    }
    return idx;
  }
  let probe = next;
  while (probe >= 0 && probe < length && isEmptyAt(probe)) {
    probe += step;
  }
  if (probe < 0) return 0;
  if (probe >= length) return length - 1;
  return probe;
}

/** Sentinel distinguishing "no match" (reject the paste) from a legitimately-resolved value. */
export const PASTE_REJECTED = Symbol("paste-rejected");

/**
 * Maps a pasted display string back to a singleSelect column's underlying value,
 * preserving the option's own type (e.g. a numeric Class Year stays a number,
 * not a stringified one). Returns PASTE_REJECTED when the column is singleSelect
 * and the text (non-empty) matches none of its options — the caller should
 * reject the paste rather than writing a value the dropdown could never produce.
 */
export function resolvePasteValue(api: GridApiCommon, field: string, text: string): unknown {
  const column = api.getColumn(field);
  if (
    !column ||
    column.type !== "singleSelect" ||
    !("valueOptions" in column) ||
    !column.valueOptions
  ) {
    return text;
  }
  if (text === "") return ""; // clearing the cell is always valid
  const valueOptions = column.valueOptions;
  const options =
    typeof valueOptions === "function"
      ? valueOptions({ field } as Parameters<typeof valueOptions>[0])
      : valueOptions;
  for (const option of options) {
    if (typeof option === "string" || typeof option === "number") {
      if (String(option) === text) return option;
    } else if (option.label === text || String(option.value) === text) {
      return option.value;
    }
  }
  return PASTE_REJECTED;
}
