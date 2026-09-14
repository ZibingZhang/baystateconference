import type { ClipboardEvent, RefObject } from "react";
import { useEffect, useRef } from "react";
import type { GridApi, GridRowId } from "@mui/x-data-grid";
import {
  cellKey,
  parseCellKey,
  PASTE_REJECTED,
  resolvePasteValue,
  selectableFields,
  type CellRef,
} from "../utils/dataGridCells";

interface UseGridClipboardOptions<T extends { id: string }> {
  apiRef: RefObject<GridApi | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;
  onUpdate: (row: T) => void;
  processRow?: (row: T) => T;
  notifyRejected: () => void;
  selectionRef: RefObject<Set<string>>;
  selection: Set<string>;
  setSelection: (next: Set<string>) => void;
  setCopiedCells: (next: Set<string>) => void;
  anchorRef: RefObject<CellRef | null>;
  buildRangeGrid: (
    cells: Set<string>,
  ) => { grid: string[][]; rowIds: GridRowId[]; fields: string[] } | null;
}

/**
 * Owns clipboard copy/paste: the Firefox-selection workaround for native
 * copy, and TSV paste parsing (single-value broadcast to a multi-selection,
 * or a rectangular block anchored at the current cell).
 */
export function useGridClipboard<T extends { id: string }>({
  apiRef,
  containerRef,
  readOnly,
  onReadOnlyAttempt,
  onUpdate,
  processRow,
  notifyRejected,
  selectionRef,
  selection,
  setSelection,
  setCopiedCells,
  anchorRef,
  buildRangeGrid,
}: UseGridClipboardOptions<T>) {
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

  return { handleCopy, handlePaste, hiddenTextareaRef };
}
