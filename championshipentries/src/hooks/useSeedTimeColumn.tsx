import { useMemo, useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import type { ImportedEvent } from "../types";
import { normalizeSeedTime } from "../utils/seedTime";
import { parseSwimTime } from "../hytek/common";
import {
  eventByDisplayName,
  qualifyingViolationMessage,
  violatesQualifyingStandard,
} from "../domain/ev3";

const INVALID_FORMAT_MESSAGE = "Invalid seed time — must be M:SS.hh or SS.hh. Value was cleared.";

/**
 * Shared `seedTime` row processing for the entries grids: normalizes valid
 * input (completing/adding the hundredths part), rejects input that doesn't
 * match either seed-time shape, and rejects a value that fails the event's
 * EV3 qualifying standard (too slow for swimming, too low a score for
 * diving) — see domain/ev3.ts's qualifying-standard helpers.
 *
 * `processRow` must only run once a row edit is actually committed (e.g. via
 * EditableDataGrid's processRowUpdate) — not from a column value getter/setter,
 * which the grid may invoke speculatively (autosizing, filtering, etc.) while
 * the user is still typing.
 */
export function useSeedTimeColumn<R extends { seedTime: string; event: string }>(
  importedEvents: ImportedEvent[] | undefined,
) {
  const [invalidOpen, setInvalidOpen] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState(INVALID_FORMAT_MESSAGE);
  // Bumped on every new error so the Snackbar remounts and replaces any
  // still-open (or closing) instance instead of being a no-op on `open`.
  const [errorKey, setErrorKey] = useState(0);

  const eventsByName = useMemo(() => eventByDisplayName(importedEvents ?? []), [importedEvents]);

  const reject = (row: R, message: string): R => {
    setInvalidMessage(message);
    setInvalidOpen(true);
    setErrorKey((k) => k + 1);
    return { ...row, seedTime: "" };
  };

  const processRow = (row: R): R => {
    const normalized = normalizeSeedTime(row.seedTime);
    if (normalized === undefined) {
      return reject(row, INVALID_FORMAT_MESSAGE);
    }
    if (normalized !== "") {
      const event = eventsByName.get(row.event);
      const seedValue = parseSwimTime(normalized);
      if (event && typeof seedValue === "number" && violatesQualifyingStandard(event, seedValue)) {
        return reject(row, qualifyingViolationMessage(event));
      }
    }
    return { ...row, seedTime: normalized };
  };

  // No autoHideDuration, and clickaway/escape are ignored: per EU accessibility
  // guidance, this must stay open until the user dismisses it via the X.
  const snackbar = (
    <Snackbar
      key={errorKey}
      open={invalidOpen}
      onClose={(_event, reason) => {
        if (reason === "clickaway" || reason === "escapeKeyDown") return;
        setInvalidOpen(false);
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity="error"
        variant="filled"
        onClose={() => setInvalidOpen(false)}
        sx={{ width: "100%" }}
      >
        {invalidMessage}
      </Alert>
    </Snackbar>
  );

  return { processRow, snackbar };
}
