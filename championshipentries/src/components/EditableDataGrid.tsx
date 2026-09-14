import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  DataGrid,
  GridActionsCellItem,
  useGridApiRef,
  type GridColDef,
  type GridRowId,
} from "@mui/x-data-grid";
import { cellKey } from "../utils/dataGridCells";
import withSelectIcon from "./withSelectIcon";
import { marchingAntsSx } from "./EditableDataGrid.styles";
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
  const [rejectErrorOpen, setRejectErrorOpen] = useState(false);
  // Bumped on every rejected input so the Snackbar remounts and replaces any
  // still-open (or closing) instance instead of being a no-op on `open`.
  const [rejectErrorKey, setRejectErrorKey] = useState(0);
  const notifyRejected = () => {
    setRejectErrorOpen(true);
    setRejectErrorKey((k) => k + 1);
  };

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

  const { sortModel, setSortModel, displayRows } = useStableSortedRows<T>(rows, allColumns);

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
          sx={marchingAntsSx}
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
