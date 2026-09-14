import type { ClipboardEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  DataGrid,
  GridActionsCellItem,
  useGridApiRef,
  type GridApiCommon,
  type GridCellParams,
  type GridColDef,
  type GridRowId,
  type GridSortCellParams,
  type GridSortModel,
  type MuiEvent,
} from "@mui/x-data-grid";
import FilterableSingleSelectEditCell from "./FilterableSingleSelectEditCell";

const CELL_KEY_SEP = " ";
const cellKey = (id: GridRowId, field: string) => `${id}${CELL_KEY_SEP}${field}`;
const parseCellKey = (key: string): CellRef => {
  const sepIndex = key.lastIndexOf(CELL_KEY_SEP);
  return { id: key.slice(0, sepIndex), field: key.slice(sepIndex + 1) };
};

interface CellRef {
  id: GridRowId;
  field: string;
}

function defaultValueComparator(v1: unknown, v2: unknown): number {
  if (typeof v1 === "number" && typeof v2 === "number") return v1 - v2;
  return String(v1 ?? "").localeCompare(String(v2 ?? ""));
}

// Our comparators (default and column-supplied) only look at v1/v2, never the
// cell params — these placeholders satisfy GridComparatorFn's signature without
// needing real GridSortCellParams (which require a live rowNode/api).
const DUMMY_SORT_CELL_PARAMS = {} as GridSortCellParams;

function selectableFields(api: GridApiCommon): string[] {
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
function findBlockEdgeIndex(
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
const PASTE_REJECTED = Symbol("paste-rejected");

/**
 * Maps a pasted display string back to a singleSelect column's underlying value,
 * preserving the option's own type (e.g. a numeric Class Year stays a number,
 * not a stringified one). Returns PASTE_REJECTED when the column is singleSelect
 * and the text (non-empty) matches none of its options — the caller should
 * reject the paste rather than writing a value the dropdown could never produce.
 */
function resolvePasteValue(api: GridApiCommon, field: string, text: string): unknown {
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

function withSelectIcon<T extends { id: string }>(
  column: GridColDef<T>,
  onInvalidCommit: () => void,
): GridColDef<T> {
  if (column.type !== "singleSelect") return column;
  const withEditCell: GridColDef<T> = column.renderEditCell
    ? column
    : {
        ...column,
        renderEditCell: (params) => (
          <FilterableSingleSelectEditCell {...params} onInvalidCommit={onInvalidCommit} />
        ),
      };
  if (withEditCell.renderCell) return withEditCell;
  return {
    ...withEditCell,
    renderCell: (params) => (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <Box
          component="span"
          sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {params.formattedValue as string}
        </Box>
        <ArrowDropDownIcon fontSize="small" sx={{ color: "action.active", flexShrink: 0 }} />
      </Box>
    ),
  };
}

interface EditableDataGridProps<T extends { id: string }> {
  rows: T[];
  columns: GridColDef<T>[];
  onAdd: () => void;
  onUpdate: (row: T) => void;
  onDelete: (id: string) => void;
  addLabel: string;
  noRowsLabel: string;
  /** Singular/plural nouns for the row-count readout, e.g. "athlete" / "athletes". */
  itemLabelSingular: string;
  itemLabelPlural: string;
  extraToolbar?: ReactNode;
  /**
   * Runs once a row edit is committed (Enter/Tab/click away), before onUpdate
   * — the place to normalize/reject freeform input, since it fires exactly
   * once per commit rather than on every keystroke like a valueSetter would.
   */
  processRow?: (row: T) => T;
  /**
   * Renders every column non-editable and redirects add/delete/paste/keyboard-clear
   * to `onReadOnlyAttempt` instead of the real mutation — used for meet templates,
   * which are viewable like a normal meet but must never be mutated in place.
   */
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;
}

function EditableDataGrid<T extends { id: string }>({
  rows,
  columns,
  onAdd,
  onUpdate,
  onDelete,
  addLabel,
  noRowsLabel,
  itemLabelSingular,
  itemLabelPlural,
  extraToolbar,
  processRow,
  readOnly,
  onReadOnlyAttempt,
}: EditableDataGridProps<T>) {
  const apiRef = useGridApiRef();
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenTextareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCopyRangeRef = useRef<{
    grid: string[][];
    rowIds: GridRowId[];
    fields: string[];
  } | null>(null);
  // Whatever had DOM focus right before we redirected it to the hidden textarea
  // for copying — restored as-is afterward, so copying never moves the active
  // cell (e.g. back to the range's anchor) regardless of where it actually was.
  const preCopyFocusRef = useRef<HTMLElement | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const selectionRef = useRef(selection);
  const [copiedCells, setCopiedCells] = useState<Set<string>>(new Set());
  const anchorRef = useRef<CellRef | null>(null);
  // Anchor for an in-progress keyboard Shift+Arrow sequence, kept separate from
  // anchorRef so a fresh Shift+Arrow always starts a brand-new selection from
  // the current cell instead of extending whatever was selected before (a
  // stale drag/click/Ctrl-click anchor) — reset on every non-shift interaction,
  // reused across consecutive Shift+Arrow presses so they keep extending.
  const shiftAnchorRef = useRef<CellRef | null>(null);
  const draggingRef = useRef(false);
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [rejectErrorOpen, setRejectErrorOpen] = useState(false);
  // Bumped on every rejected input so the Snackbar remounts and replaces any
  // still-open (or closing) instance instead of being a no-op on `open`.
  const [rejectErrorKey, setRejectErrorKey] = useState(0);
  const notifyRejected = () => {
    setRejectErrorOpen(true);
    setRejectErrorKey((k) => k + 1);
  };

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleShortcutKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return;
      const key = event.key.toLowerCase();
      if (key === "v") {
        // Stop MUI's own cell-editing hook from treating this as a "paste shortcut"
        // and switching the cell into edit mode, which would swallow the native
        // paste event before our onPaste handler runs.
        event.stopPropagation();
        return;
      }
      if (key === "c") {
        // Firefox only fires the native 'copy' event when real text is selected
        // (Chrome fires it on the shortcut regardless). Cell text isn't selectable
        // (see user-select: none below), so give the browser something real to
        // copy: a hidden textarea holding the range's TSV, selected right before
        // the browser's own copy action runs.
        const range = buildRangeGrid(selectionRef.current);
        const textarea = hiddenTextareaRef.current;
        if (!range || !textarea) return;
        textarea.value = range.grid.map((row) => row.join("\t")).join("\n");
        pendingCopyRangeRef.current = range;
        preCopyFocusRef.current = document.activeElement as HTMLElement | null;
        textarea.focus();
        textarea.select();
      }
    };
    el.addEventListener("keydown", handleShortcutKeyDown, true);
    return () => el.removeEventListener("keydown", handleShortcutKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rangeBetween = (a: CellRef, b: CellRef): Set<string> => {
    const api = apiRef.current;
    if (!api) return new Set([cellKey(a.id, a.field)]);
    const rowIds = api.getSortedRowIds();
    const fields = selectableFields(api);
    const rowStart = rowIds.indexOf(a.id);
    const rowEnd = rowIds.indexOf(b.id);
    const colStart = fields.indexOf(a.field);
    const colEnd = fields.indexOf(b.field);
    if (rowStart === -1 || rowEnd === -1 || colStart === -1 || colEnd === -1) {
      return new Set([cellKey(a.id, a.field)]);
    }
    const [rowLo, rowHi] = rowStart <= rowEnd ? [rowStart, rowEnd] : [rowEnd, rowStart];
    const [colLo, colHi] = colStart <= colEnd ? [colStart, colEnd] : [colEnd, colStart];
    const next = new Set<string>();
    for (let r = rowLo; r <= rowHi; r += 1) {
      for (let c = colLo; c <= colHi; c += 1) {
        next.add(cellKey(rowIds[r], fields[c]));
      }
    }
    return next;
  };

  /** Bounding rectangle of `cells`, read out as a 2D grid of formatted values (for clipboard TSV). */
  const buildRangeGrid = (
    cells: Set<string>,
  ): { grid: string[][]; rowIds: GridRowId[]; fields: string[] } | null => {
    const api = apiRef.current;
    if (!api || cells.size === 0) return null;
    const rowIds = api.getSortedRowIds();
    const fields = selectableFields(api);
    let rowLo = Infinity;
    let rowHi = -1;
    let colLo = Infinity;
    let colHi = -1;
    cells.forEach((key) => {
      const { id, field } = parseCellKey(key);
      const r = rowIds.indexOf(id);
      const c = fields.indexOf(field);
      if (r === -1 || c === -1) return;
      rowLo = Math.min(rowLo, r);
      rowHi = Math.max(rowHi, r);
      colLo = Math.min(colLo, c);
      colHi = Math.max(colHi, c);
    });
    if (rowHi === -1) return null;
    const rangeRowIds = rowIds.slice(rowLo, rowHi + 1);
    const rangeFields = fields.slice(colLo, colHi + 1);
    const grid = rangeRowIds.map((id) =>
      rangeFields.map((field) => {
        const value = api.getCellParams(id, field).formattedValue;
        return value == null ? "" : String(value);
      }),
    );
    return { grid, rowIds: rangeRowIds, fields: rangeFields };
  };

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const unsubDown = api.subscribeEvent(
      "cellMouseDown",
      (params: GridCellParams<T>, event: MuiEvent<MouseEvent<HTMLElement>>) => {
        if (params.field === "actions") return;
        const cell: CellRef = { id: params.id, field: params.field };
        if (event.shiftKey && anchorRef.current) {
          setSelection(rangeBetween(anchorRef.current, cell));
          shiftAnchorRef.current = anchorRef.current;
        } else if (event.metaKey || event.ctrlKey) {
          setSelection((prev) => {
            const next = new Set(prev);
            const key = cellKey(cell.id, cell.field);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
          });
          anchorRef.current = cell;
          shiftAnchorRef.current = null;
        } else {
          anchorRef.current = cell;
          setSelection(new Set([cellKey(cell.id, cell.field)]));
          shiftAnchorRef.current = null;
        }
        draggingRef.current = true;
      },
    );
    const unsubOver = api.subscribeEvent("cellMouseOver", (params: GridCellParams<T>) => {
      if (!draggingRef.current || !anchorRef.current || params.field === "actions") return;
      setSelection(rangeBetween(anchorRef.current, { id: params.id, field: params.field }));
    });
    return () => {
      unsubDown();
      unsubOver();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRef]);

  useEffect(() => {
    const onMouseUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, []);

  // Fields the caller declared editable=true, before readOnly forces them all off below —
  // used to tell "clicked a cell that would normally be editable" from a genuinely
  // non-editable one (e.g. a computed column), so onReadOnlyAttempt only fires on the former.
  const editableFields = useMemo(
    () => new Set(columns.filter((c) => c.editable).map((c) => c.field)),
    [columns],
  );

  const handleCellKeyDown = (
    params: GridCellParams<T>,
    event: MuiEvent<KeyboardEvent<HTMLElement>>,
  ) => {
    if (readOnly) {
      if (
        (event.key === "Delete" || event.key === "Backspace" || event.key === "Enter") &&
        editableFields.has(params.field)
      ) {
        onReadOnlyAttempt?.();
      }
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && params.cellMode !== "edit") {
      const api = apiRef.current;
      if (api && selection.size > 1 && selection.has(cellKey(params.id, params.field))) {
        event.defaultMuiPrevented = true;
        const byRow = new Map<GridRowId, T>();
        selection.forEach((key) => {
          const { id, field } = parseCellKey(key);
          const cellParams = api.getCellParams(id, field);
          if (!api.isCellEditable(cellParams)) return;
          if (cellParams.value === "" || cellParams.value == null) return;
          const row = byRow.get(id) ?? { ...cellParams.row };
          byRow.set(id, { ...row, [field]: "" });
        });
        byRow.forEach((row) => onUpdate(row));
        return;
      }
      if (!params.isEditable) return;
      // Stop the grid's default behavior of entering edit mode (which opens the
      // select dropdown / shows a text cursor) just to clear the value.
      event.defaultMuiPrevented = true;
      if (params.value !== "" && params.value != null) {
        onUpdate({ ...params.row, [params.field]: "" });
      }
      return;
    }
    if (
      event.key === "Escape" &&
      params.cellMode !== "edit" &&
      (copiedCells.size > 0 || selection.size > 0)
    ) {
      setCopiedCells(new Set());
      setSelection(new Set());
      anchorRef.current = null;
      shiftAnchorRef.current = null;
      return;
    }
    const isArrowKey =
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight";
    if (isArrowKey && params.cellMode !== "edit") {
      const api = apiRef.current;
      if (!api) return;
      const isVertical = event.key === "ArrowUp" || event.key === "ArrowDown";
      const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
      const rowIds = api.getSortedRowIds();
      const fields = selectableFields(api);
      const rowIndex = rowIds.indexOf(params.id);
      const colIndex = fields.indexOf(params.field);

      if (event.shiftKey) {
        event.preventDefault();
        event.defaultMuiPrevented = true;
        // A fresh Shift+Arrow (no in-progress shift-selection) always starts a
        // brand-new range from the current cell, discarding any prior
        // click/drag/Ctrl-click selection rather than extending it.
        if (!shiftAnchorRef.current) {
          shiftAnchorRef.current = { id: params.id, field: params.field };
          anchorRef.current = shiftAnchorRef.current;
        }
        let nextRowIndex: number;
        let nextColIndex: number;
        if (event.metaKey || event.ctrlKey) {
          // Shift+Ctrl/Cmd+Arrow: jump to the block edge like the plain
          // Ctrl/Cmd+Arrow below, but select every cell between the shift
          // anchor and the landing cell instead of collapsing to it.
          const isEmptyAt = (index: number) => {
            const value = isVertical
              ? api.getCellParams(rowIds[index], params.field).value
              : api.getCellParams(params.id, fields[index]).value;
            return value === "" || value == null;
          };
          nextRowIndex = isVertical
            ? findBlockEdgeIndex(isEmptyAt, rowIds.length, rowIndex, step)
            : rowIndex;
          nextColIndex = isVertical
            ? colIndex
            : findBlockEdgeIndex(isEmptyAt, fields.length, colIndex, step);
        } else {
          nextRowIndex = isVertical ? rowIndex + step : rowIndex;
          nextColIndex = isVertical ? colIndex : colIndex + step;
        }
        if (
          nextRowIndex < 0 ||
          nextRowIndex >= rowIds.length ||
          nextColIndex < 0 ||
          nextColIndex >= fields.length
        ) {
          return;
        }
        const nextId = rowIds[nextRowIndex];
        const nextField = fields[nextColIndex];
        setSelection(rangeBetween(shiftAnchorRef.current, { id: nextId, field: nextField }));
        api.setCellFocus(nextId, nextField);
        api.scrollToIndexes({ rowIndex: nextRowIndex, colIndex: nextColIndex });
        return;
      }

      shiftAnchorRef.current = null;

      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        event.defaultMuiPrevented = true;
        const isEmptyAt = (index: number) => {
          const value = isVertical
            ? api.getCellParams(rowIds[index], params.field).value
            : api.getCellParams(params.id, fields[index]).value;
          return value === "" || value == null;
        };
        const targetRowIndex = isVertical
          ? findBlockEdgeIndex(isEmptyAt, rowIds.length, rowIndex, step)
          : rowIndex;
        const targetColIndex = isVertical
          ? colIndex
          : findBlockEdgeIndex(isEmptyAt, fields.length, colIndex, step);
        const targetId = rowIds[targetRowIndex];
        const targetField = fields[targetColIndex];
        anchorRef.current = { id: targetId, field: targetField };
        setSelection(new Set([cellKey(targetId, targetField)]));
        api.setCellFocus(targetId, targetField);
        api.scrollToIndexes({ rowIndex: targetRowIndex, colIndex: targetColIndex });
        return;
      }

      if (!event.metaKey && !event.ctrlKey) {
        // Plain navigation: MUI moves its own focus by default (not prevented
        // here), but copy/paste read OUR anchor/selection, not the DOM — sync
        // them to the cell being navigated to so Ctrl+C/Ctrl+V work from a
        // cell reached by arrow keys, not just by clicking.
        const nextRowIndex = isVertical ? rowIndex + step : rowIndex;
        const nextColIndex = isVertical ? colIndex : colIndex + step;
        if (
          nextRowIndex >= 0 &&
          nextRowIndex < rowIds.length &&
          nextColIndex >= 0 &&
          nextColIndex < fields.length
        ) {
          const nextId = rowIds[nextRowIndex];
          const nextField = fields[nextColIndex];
          anchorRef.current = { id: nextId, field: nextField };
          setSelection(new Set([cellKey(nextId, nextField)]));
        }
      }
    }
    if (event.key !== "Tab" || params.cellMode === "edit") return;
    if (!apiRef.current) return;
    event.preventDefault();

    const cols = apiRef.current.getAllColumns();
    const rowIds = apiRef.current.getSortedRowIds();
    const colIndex = cols.findIndex((c) => c.field === params.field);
    const rowIndex = rowIds.indexOf(params.id);
    const step = event.shiftKey ? -1 : 1;

    let nextColIndex = colIndex + step;
    let nextRowIndex = rowIndex;
    if (nextColIndex < 0) {
      nextColIndex = cols.length - 1;
      nextRowIndex -= 1;
    } else if (nextColIndex >= cols.length) {
      nextColIndex = 0;
      nextRowIndex += 1;
    }

    if (nextRowIndex < 0 || nextRowIndex >= rowIds.length) return;
    const nextId = rowIds[nextRowIndex];
    const nextField = cols[nextColIndex].field;
    shiftAnchorRef.current = null;
    anchorRef.current = { id: nextId, field: nextField };
    setSelection(new Set([cellKey(nextId, nextField)]));
    apiRef.current.setCellFocus(nextId, nextField);
  };

  const copiedCellSides = (id: GridRowId, field: string): string => {
    const key = cellKey(id, field);
    if (!copiedCells.has(key)) return "";
    const api = apiRef.current;
    if (!api) return "copied-cell";
    const rowIds = api.getSortedRowIds();
    const fields = selectableFields(api);
    const rowIdx = rowIds.indexOf(id);
    const colIdx = fields.indexOf(field);
    const hasNeighbor = (r: number, c: number) =>
      r >= 0 &&
      r < rowIds.length &&
      c >= 0 &&
      c < fields.length &&
      copiedCells.has(cellKey(rowIds[r], fields[c]));
    const classes = ["copied-cell"];
    if (!hasNeighbor(rowIdx - 1, colIdx)) classes.push("copied-side-top");
    if (!hasNeighbor(rowIdx + 1, colIdx)) classes.push("copied-side-bottom");
    if (!hasNeighbor(rowIdx, colIdx - 1)) classes.push("copied-side-left");
    if (!hasNeighbor(rowIdx, colIdx + 1)) classes.push("copied-side-right");
    return classes.join(" ");
  };

  const handleCopy = () => {
    // The actual clipboard write already happened natively (see handleShortcutKeyDown):
    // this just picks up the range it staged, to light up the marching ants and
    // hand focus back to wherever it actually was before the hidden textarea
    // borrowed it — copying shouldn't move the active cell at all.
    const range = pendingCopyRangeRef.current;
    if (!range) return;
    pendingCopyRangeRef.current = null;
    const next = new Set<string>();
    range.rowIds.forEach((id) => range.fields.forEach((field) => next.add(cellKey(id, field))));
    setCopiedCells(next);
    preCopyFocusRef.current?.focus();
    preCopyFocusRef.current = null;
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (readOnly) {
      onReadOnlyAttempt?.();
      return;
    }
    const api = apiRef.current;
    const anchor = anchorRef.current;
    if (!api || !anchor) return;
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    const pastedRows = text
      .replace(/\r/g, "")
      .split("\n")
      .filter((line, i, arr) => i < arr.length - 1 || line !== "")
      .map((line) => line.split("\t"));
    if (pastedRows.length === 0) return;

    const rowIds = api.getSortedRowIds();
    const fields = selectableFields(api);
    const byRow = new Map<GridRowId, T>();
    const pastedKeys = new Set<string>();
    let hadRejection = false;
    const applyPaste = (id: GridRowId, field: string, value: string) => {
      const cellParams = api.getCellParams(id, field);
      if (!api.isCellEditable(cellParams)) return;
      const resolved = resolvePasteValue(api, field, value);
      if (resolved === PASTE_REJECTED) {
        hadRejection = true;
        return;
      }
      const row = byRow.get(id) ?? { ...cellParams.row };
      byRow.set(id, { ...row, [field]: resolved });
      pastedKeys.add(cellKey(id, field));
    };

    if (pastedRows.length === 1 && pastedRows[0].length === 1 && selection.size > 1) {
      selection.forEach((key) => {
        const { id, field } = parseCellKey(key);
        applyPaste(id, field, pastedRows[0][0]);
      });
    } else {
      const startRow = rowIds.indexOf(anchor.id);
      const startCol = fields.indexOf(anchor.field);
      if (startRow === -1 || startCol === -1) return;
      pastedRows.forEach((rowValues, rOffset) => {
        const r = startRow + rOffset;
        if (r >= rowIds.length) return;
        rowValues.forEach((value, cOffset) => {
          const c = startCol + cOffset;
          if (c >= fields.length) return;
          applyPaste(rowIds[r], fields[c], value);
        });
      });
    }

    byRow.forEach((row) => onUpdate(processRow ? processRow(row) : row));
    if (pastedKeys.size > 0) setSelection(pastedKeys);
    if (hadRejection) notifyRejected();
  };

  const allColumns: GridColDef<T>[] = [
    ...columns.map((column) =>
      withSelectIcon(readOnly ? { ...column, editable: false } : column, notifyRejected),
    ),
    {
      field: "actions",
      type: "actions",
      width: 56,
      getActions: (params) => [
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon fontSize="small" />}
          label="Delete"
          onClick={() =>
            readOnly ? onReadOnlyAttempt?.() : onDelete(params.id as GridRowId as string)
          }
        />,
      ],
    },
  ];

  // Row order is frozen across edits: sorting only re-runs when the sort
  // column/direction changes or when rows are added/removed, never just
  // because an edited value would otherwise reshuffle the sorted column —
  // that reshuffling mid-edit is disorienting (e.g. a row jumping away from
  // the cursor right after typing into it). `sortingMode="server"` below
  // hands row ordering entirely to this memo instead of DataGrid's own
  // (order-follows-every-render) client sort.
  const orderRef = useRef<GridRowId[]>([]);
  const lastOrderKeyRef = useRef<string | null>(null);
  const displayRows = useMemo(() => {
    const rowById = new Map<GridRowId, T>(rows.map((row) => [row.id, row]));
    const idsKey = rows
      .map((row) => row.id)
      .slice()
      .sort()
      .join(" ");
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

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => (readOnly ? onReadOnlyAttempt?.() : onAdd())}
        >
          {addLabel}
        </Button>
        {extraToolbar}
        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
          {rows.length} {rows.length === 1 ? itemLabelSingular : itemLabelPlural}
        </Typography>
      </Box>
      <Box
        ref={containerRef}
        sx={{ flex: 1, minHeight: 0 }}
        onCopy={handleCopy}
        onPaste={handlePaste}
      >
        <Box
          component="textarea"
          ref={hiddenTextareaRef}
          tabIndex={-1}
          readOnly
          sx={{
            position: "fixed",
            top: "-1000px",
            left: "-1000px",
            width: "1px",
            height: "1px",
            opacity: 0,
          }}
        />
        <DataGrid
          apiRef={apiRef}
          rows={displayRows}
          columns={allColumns}
          density="compact"
          hideFooter
          disableRowSelectionOnClick
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          localeText={{ noRowsLabel }}
          onCellKeyDown={handleCellKeyDown}
          onCellClick={(params) => {
            if (readOnly && editableFields.has(params.field)) onReadOnlyAttempt?.();
          }}
          onCellDoubleClick={(params) => {
            if (readOnly && editableFields.has(params.field)) onReadOnlyAttempt?.();
          }}
          getCellClassName={(params) =>
            [
              selection.size > 1 && selection.has(cellKey(params.id, params.field))
                ? "multi-selected-cell"
                : "",
              copiedCellSides(params.id, params.field),
            ]
              .filter(Boolean)
              .join(" ")
          }
          sx={(theme) => ({
            "& .MuiDataGrid-cell": { userSelect: "none" },
            "& .MuiDataGrid-cell--editing": { userSelect: "text" },
            "& .multi-selected-cell": { backgroundColor: "action.selected" },
            "& .copied-cell": { position: "relative" },
            "& .copied-cell::before, & .copied-cell::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
            },
            "& .copied-cell::before": {
              backgroundImage:
                "linear-gradient(90deg, var(--ants-top, transparent) 50%, transparent 0)," +
                "linear-gradient(90deg, var(--ants-bottom, transparent) 50%, transparent 0)",
              backgroundSize: "8px 2px, 8px 2px",
              backgroundRepeat: "repeat-x, repeat-x",
              animation: "marching-ants-x 0.5s linear infinite",
            },
            "& .copied-cell::after": {
              backgroundImage:
                "linear-gradient(0deg, var(--ants-left, transparent) 50%, transparent 0)," +
                "linear-gradient(0deg, var(--ants-right, transparent) 50%, transparent 0)",
              backgroundSize: "2px 8px, 2px 8px",
              backgroundRepeat: "repeat-y, repeat-y",
              animation: "marching-ants-y 0.5s linear infinite",
            },
            "& .copied-side-top": { "--ants-top": theme.palette.primary.main },
            "& .copied-side-bottom": { "--ants-bottom": theme.palette.primary.main },
            "& .copied-side-left": { "--ants-left": theme.palette.primary.main },
            "& .copied-side-right": { "--ants-right": theme.palette.primary.main },
            "@keyframes marching-ants-x": {
              from: { backgroundPosition: "0px 0%, 0px 100%" },
              to: { backgroundPosition: "8px 0%, 8px 100%" },
            },
            "@keyframes marching-ants-y": {
              from: { backgroundPosition: "0% 0px, 100% 0px" },
              to: { backgroundPosition: "0% 8px, 100% 8px" },
            },
          })}
          processRowUpdate={(updated) => {
            const processed = processRow ? processRow(updated) : updated;
            onUpdate(processed);
            return processed;
          }}
        />
      </Box>
      <Snackbar
        key={rejectErrorKey}
        open={rejectErrorOpen}
        onClose={(_event, reason) => {
          if (reason === "clickaway" || reason === "escapeKeyDown") return;
          setRejectErrorOpen(false);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setRejectErrorOpen(false)}
          sx={{ width: "100%" }}
        >
          Value didn't match a valid option and was rejected.
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default EditableDataGrid;
