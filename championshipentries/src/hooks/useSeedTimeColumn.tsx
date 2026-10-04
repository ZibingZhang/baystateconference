import { useMemo } from "react";
import type { ImportedEvent } from "../types";
import { eventByNumber, validateSeedTime } from "../domain/ev3";
import { useGridAlertBanner } from "./useGridAlertBanner";

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
export function useSeedTimeColumn<R extends { seedTime: string; event: number }>(
  importedEvents: ImportedEvent[] | undefined,
) {
  const { notify, banner } = useGridAlertBanner();
  const eventsByNumber = useMemo(() => eventByNumber(importedEvents ?? []), [importedEvents]);

  const processRow = (row: R): R => {
    const { normalized, errorMessage } = validateSeedTime(
      row.seedTime,
      eventsByNumber.get(row.event),
    );
    if (errorMessage) {
      notify(`${errorMessage} Value was cleared.`);
      return { ...row, seedTime: "" };
    }
    return { ...row, seedTime: normalized };
  };

  /** Called by the seedTime cell editor when an Enter/Tab/blur commit was blocked by a validation error. */
  const notifyBlockedEdit = (message: string, refocus: () => void) => {
    notify(message, refocus);
  };

  return { processRow, snackbar: banner, notifyBlockedEdit };
}
