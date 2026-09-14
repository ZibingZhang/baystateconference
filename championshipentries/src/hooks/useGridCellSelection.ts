import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import type { GridApi, GridCellParams, GridRowId, MuiEvent } from "@mui/x-data-grid";
import { cellKey, parseCellKey, selectableFields, type CellRef } from "../utils/dataGridCells";

/**
 * Owns cell-selection state (click/shift-click/ctrl-click/drag-select) and the
 * range math built on top of it. Shared by keyboard navigation and clipboard
 * copy/paste, which both read and mutate this selection.
 */
export function useGridCellSelection<T extends { id: string }>(apiRef: RefObject<GridApi | null>) {
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

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

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
      (params: GridCellParams<T>, event: MuiEvent<ReactMouseEvent<HTMLElement>>) => {
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

  return {
    selection,
    setSelection,
    selectionRef,
    copiedCells,
    setCopiedCells,
    anchorRef,
    shiftAnchorRef,
    rangeBetween,
    buildRangeGrid,
    copiedCellSides,
  };
}
