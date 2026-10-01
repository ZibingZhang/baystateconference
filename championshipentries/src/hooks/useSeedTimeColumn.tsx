import { useMemo, useRef, useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import type { ImportedEvent } from "../types";
import { eventByDisplayName, validateSeedTime } from "../domain/ev3";

/**
 * Shared `seedTime` row processing for the entries grids: normalizes valid
 * input (completing/adding the hundredths part), rejects input that doesn't
 * match either seed-time shape, and rejects a value that fails the event's
 * EV3 qualifying standard (too slow for swimming, too low a score for
 * diving) — see domain/ev3.ts's qualifying-standard helpers.
 *
 * `processRow` must only run once a row edit is actually committed outside
 * of normal single-cell editing (e.g. a paste) — not from a column value
 * getter/setter, which the grid may invoke speculatively (autosizing,
 * filtering, etc.) while the user is still typing. Single-cell edits never
 * reach `processRow` at all for an invalid value: the `seedTime` column
 * (built by `buildSeedTimeColumn`) uses `preProcessEditCellProps` to keep
 * the cell in edit mode until the value is valid, and calls
 * `notifyBlockedEdit` to show the same banner without losing the edit.
 */
export function useSeedTimeColumn<R extends { seedTime: string; event: string }>(
  importedEvents: ImportedEvent[] | undefined,
) {
  const [invalidOpen, setInvalidOpen] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState("");
  // Bumped on every new error so the Snackbar remounts and replaces any
  // still-open (or closing) instance instead of being a no-op on `open`.
  const [errorKey, setErrorKey] = useState(0);
  // Set only by notifyBlockedEdit, so dismissing the banner can refocus the
  // cell that's still mid-edit — unrelated processRow rejections leave this
  // null, since there's no edit mode to return focus to.
  const refocusRef = useRef<(() => void) | null>(null);

  const eventsByName = useMemo(() => eventByDisplayName(importedEvents ?? []), [importedEvents]);

  const notify = (message: string, refocus: (() => void) | null) => {
    refocusRef.current = refocus;
    setInvalidMessage(message);
    setInvalidOpen(true);
    setErrorKey((k) => k + 1);
  };

  const processRow = (row: R): R => {
    const { normalized, errorMessage } = validateSeedTime(
      row.seedTime,
      eventsByName.get(row.event),
    );
    if (errorMessage) {
      notify(`${errorMessage} Value was cleared.`, null);
      return { ...row, seedTime: "" };
    }
    return { ...row, seedTime: normalized };
  };

  /** Called by the seedTime cell editor when an Enter/Tab/blur commit was blocked by a validation error. */
  const notifyBlockedEdit = (message: string, refocus: () => void) => {
    notify(message, refocus);
  };

  const dismiss = () => {
    setInvalidOpen(false);
    refocusRef.current?.();
    refocusRef.current = null;
  };

  // No autoHideDuration, and clickaway/escape are ignored: per EU accessibility
  // guidance, this must stay open until the user dismisses it via the X.
  const snackbar = (
    <Snackbar
      key={errorKey}
      open={invalidOpen}
      onClose={(_event, reason) => {
        if (reason === "clickaway" || reason === "escapeKeyDown") return;
        dismiss();
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity="error"
        variant="filled"
        sx={{ width: "100%" }}
        action={
          // The grid's own "click outside the focused cell" detector
          // (useGridFocus's handleDocumentClick) listens for `mouseup` on
          // `document`, not `click` — so stopping propagation has to happen
          // on mouseUp specifically, before that event ever reaches
          // document, or it treats this click as a blur and refires the same
          // validation error before the click even reaches onClick below.
          // onMouseDown's preventDefault additionally stops the native
          // focus-steal a click would otherwise cause. Both matter, which is
          // why this isn't just Alert's built-in onClose button.
          <IconButton
            size="small"
            color="inherit"
            aria-label="Close"
            onMouseDown={(e) => e.preventDefault()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={dismiss}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        {invalidMessage}
      </Alert>
    </Snackbar>
  );

  return { processRow, snackbar, notifyBlockedEdit };
}
