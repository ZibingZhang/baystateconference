import { useEffect, useRef } from "react";
import {
  GridEditInputCell,
  useGridApiContext,
  type GridRenderEditCellParams,
} from "@mui/x-data-grid";

interface SeedTimeEditCellProps extends GridRenderEditCellParams {
  /** Message set by the column's preProcessEditCellProps when the current value is invalid. */
  errorMessage?: string;
  /** Called when the user tries to commit (Enter/Tab/blur) while `errorMessage` is set. */
  onBlockedCommit?: (message: string, refocus: () => void) => void;
}

/**
 * Wraps the grid's default text edit cell to surface a blocked commit: when
 * `preProcessEditCellProps` has set `error` (which already keeps the grid
 * from leaving edit mode — see MUI's editing-validation docs), this notifies
 * the caller with the specific reason and a way to refocus the cell's input
 * once the caller's own banner is dismissed.
 */
function SeedTimeEditCell({ onBlockedCommit, errorMessage, ...params }: SeedTimeEditCellProps) {
  const { id, field } = params;
  const apiRef = useGridApiContext();
  // Mirrors `errorMessage` for the cellEditStop listener below, so that
  // listener doesn't need to resubscribe on every keystroke.
  const errorMessageRef = useRef(errorMessage);
  errorMessageRef.current = errorMessage;

  useEffect(() => {
    return apiRef.current.subscribeEvent("cellEditStop", (stopParams) => {
      if (stopParams.id !== id || stopParams.field !== field) return;
      if (stopParams.reason === "escapeKeyDown") return;
      const message = errorMessageRef.current;
      if (!message) return;
      // Every blocked attempt (even a repeat of the same still-invalid
      // value) re-notifies, replacing any banner already showing — the
      // caller's notify bumps a key that remounts it. The banner's own close
      // button stops propagation specifically so clicking it doesn't count
      // as one of these attempts (see useSeedTimeColumn's Alert action).
      onBlockedCommit?.(message, () => {
        apiRef.current.getCellElement(id, field)?.querySelector("input")?.focus();
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRef, id, field]);

  // The grid debounces setEditCellValue by 200ms by default, so the error
  // recomputed by preProcessEditCellProps for the very last keystroke can
  // still be in flight when Enter is pressed right after typing — the commit
  // then reads a stale `error` from an earlier (possibly invalid) partial
  // value and blocks a value that's actually valid, requiring a second Enter.
  // debounceMs={0} applies each keystroke's value (and its validation)
  // immediately instead of after a pause, closing that window.
  return <GridEditInputCell {...params} debounceMs={0} />;
}

export default SeedTimeEditCell;
