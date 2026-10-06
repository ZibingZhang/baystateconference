import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  DataGrid,
  GridActionsCellItem,
  useGridApiRef,
  type GridCellParams,
  type GridColDef,
  type GridRowId,
} from "@mui/x-data-grid";
import { cellKey, readOnlyGuard } from "../utils/dataGridCells";
import withSelectIcon from "./withSelectIcon";
import { marchingAntsSx } from "./EditableDataGrid.styles";
import { useGridAlertBanner } from "../hooks/useGridAlertBanner";
import { useGridCellSelection } from "../hooks/useGridCellSelection";
import { useGridKeyboardNav } from "../hooks/useGridKeyboardNav";
import { useGridClipboard } from "../hooks/useGridClipboard";
import { useStableSortedRows } from "../hooks/useStableSortedRows";

interface EditableDataGridProps<T extends { id: string }> {
  rows: T[];
  columns: GridColDef<T>[];
  onAdd: () => void;
  onUpdate: (row: T) => void;
  onDelete: (id: string) => void;
  /**
   * When provided, prepends a drag-handle column so rows can be dragged into
   * a new order. Receives the row ids in their new order. Disabled while a
   * column sort is active, since dragging a visually-sorted row can't mean
   * "move it here" in the underlying (unsorted) order.
   */
  onReorder?: (orderedIds: string[]) => void;
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
  /** When provided, the active sort column/direction persists across page loads. */
  storageKey?: string;
}

function EditableDataGrid<T extends { id: string }>({
  rows,
  columns,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  addLabel,
  noRowsLabel,
  itemLabelSingular,
  itemLabelPlural,
  extraToolbar,
  processRow,
  readOnly,
  onReadOnlyAttempt,
  storageKey,
}: EditableDataGridProps<T>) {
  const apiRef = useGridApiRef();
  const containerRef = useRef<HTMLDivElement>(null);
  const { notify: notifyRejectedRaw, banner: rejectedBanner } = useGridAlertBanner();
  const notifyRejected = () =>
    notifyRejectedRaw("Value didn't match a valid option and was rejected.");

  const {
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
  } = useGridCellSelection<T>(apiRef);

  // Fields the caller declared editable=true, before readOnly forces them all off below —
  // used to tell "clicked a cell that would normally be editable" from a genuinely
  // non-editable one (e.g. a computed column), so onReadOnlyAttempt only fires on the former.
  const editableFields = useMemo(
    () => new Set(columns.filter((c) => c.editable).map((c) => c.field)),
    [columns],
  );

  const attemptIfReadOnlyField = (params: GridCellParams<T>) => {
    if (readOnly && editableFields.has(params.field)) onReadOnlyAttempt?.();
  };

  const { handleCellKeyDown } = useGridKeyboardNav<T>({
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
  });

  const { handleCopy, handlePaste, hiddenTextareaRef } = useGridClipboard<T>({
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
  });

  const { sortModel, setSortModel, displayRows } = useStableSortedRows<T>(
    rows,
    columns,
    storageKey,
  );
  const isSorted = sortModel.some((item) => item.sort);
  const canReorder = Boolean(onReorder) && !isSorted && !readOnly;

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

  const rowIdAtPoint = (x: number, y: number): string | null =>
    (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>(
      ".MuiDataGrid-row",
    )?.dataset.id ?? null;

  const handlePointerDown = (sourceId: string) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canReorder) {
      if (readOnly) onReadOnlyAttempt?.();
      return;
    }
    event.preventDefault();
    setDraggingId(sourceId);

    const onMove = (moveEvent: PointerEvent) => {
      const targetId = rowIdAtPoint(moveEvent.clientX, moveEvent.clientY);
      setDragOverRowId(targetId && targetId !== sourceId ? targetId : null);
    };
    const onUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDraggingId(null);
      setDragOverRowId(null);
      const targetId = rowIdAtPoint(upEvent.clientX, upEvent.clientY);
      if (!onReorder || !targetId || targetId === sourceId) return;
      const ids = displayRows.map((row) => row.id);
      const from = ids.indexOf(sourceId);
      const to = ids.indexOf(targetId);
      if (from === -1 || to === -1) return;
      const next = ids.slice();
      next.splice(from, 1);
      next.splice(to, 0, sourceId);
      onReorder(next);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const reorderColumn: GridColDef<T> | null = onReorder
    ? {
        field: "__reorder",
        headerName: "",
        width: 40,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        resizable: false,
        hideable: false,
        renderCell: (params) => (
          <Tooltip title={isSorted ? "Clear sorting to drag and drop rows" : ""}>
            <Box
              onPointerDown={handlePointerDown(params.id as GridRowId as string)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                cursor: canReorder ? "grab" : "default",
                color: canReorder ? "action.active" : "action.disabled",
                touchAction: "none",
              }}
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
          </Tooltip>
        ),
      }
    : null;

  const allColumns: GridColDef<T>[] = [
    ...(reorderColumn ? [reorderColumn] : []),
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
          onClick={readOnlyGuard(readOnly, onReadOnlyAttempt, () =>
            onDelete(params.id as GridRowId as string),
          )}
        />,
      ],
    },
  ];

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          mb: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "nowrap",
          overflowX: "auto",
          "& > *": { flexShrink: 0 },
        }}
      >
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={readOnlyGuard(readOnly, onReadOnlyAttempt, onAdd)}
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
          onCellClick={attemptIfReadOnlyField}
          onCellDoubleClick={attemptIfReadOnlyField}
          getRowClassName={(params) =>
            [
              params.id === dragOverRowId ? "drag-over-row" : "",
              params.id === draggingId ? "dragging-row" : "",
            ]
              .filter(Boolean)
              .join(" ")
          }
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
          sx={marchingAntsSx}
          processRowUpdate={(updated) => {
            const processed = processRow ? processRow(updated) : updated;
            onUpdate(processed);
            return processed;
          }}
        />
      </Box>
      {rejectedBanner}
    </Box>
  );
}

export default EditableDataGrid;
