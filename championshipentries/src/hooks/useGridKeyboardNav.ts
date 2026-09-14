import type { KeyboardEvent, RefObject } from "react";
import type { GridApi, GridCellParams, GridRowId, MuiEvent } from "@mui/x-data-grid";
import {
  cellKey,
  findBlockEdgeIndex,
  parseCellKey,
  selectableFields,
  type CellRef,
} from "../utils/dataGridCells";

interface UseGridKeyboardNavOptions<T extends { id: string }> {
  apiRef: RefObject<GridApi | null>;
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;
  editableFields: Set<string>;
  onUpdate: (row: T) => void;
  selection: Set<string>;
  copiedCells: Set<string>;
  setCopiedCells: (next: Set<string>) => void;
  setSelection: (next: Set<string>) => void;
  anchorRef: RefObject<CellRef | null>;
  shiftAnchorRef: RefObject<CellRef | null>;
  rangeBetween: (a: CellRef, b: CellRef) => Set<string>;
}

/** Owns keyboard interaction with the grid: Delete/Backspace clear, Escape, arrow-key navigation (incl. Ctrl block-jump/Shift-extend), and Tab/Shift+Tab. */
export function useGridKeyboardNav<T extends { id: string }>({
  apiRef,
  readOnly,
  onReadOnlyAttempt,
  editableFields,
  onUpdate,
  selection,
  copiedCells,
  setCopiedCells,
  setSelection,
  anchorRef,
  shiftAnchorRef,
  rangeBetween,
}: UseGridKeyboardNavOptions<T>) {
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

  return { handleCellKeyDown };
}
