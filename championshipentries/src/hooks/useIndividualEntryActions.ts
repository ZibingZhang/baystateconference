import type { AppData, IndividualEntry } from "../types";

interface IndividualEntryCrud {
  addMany: (items: Omit<IndividualEntry, "id" | "meetId">[]) => void;
  update: (entry: IndividualEntry) => void;
  deleteById: (id: string) => void;
  clearForMeet: (keepIds?: Set<string>) => void;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

function clearAllConfirmMessage(count: number, singular: string, plural: string): string {
  return `Delete all ${count} ${count === 1 ? singular : plural}? This cannot be undone.`;
}

function blankIndividualEntry(event = ""): Omit<IndividualEntry, "id" | "meetId"> {
  return { athleteId: "", event, seedTime: "" };
}

/** Individual entry CRUD wrapping the generic `useMeetCrud`. */
export function useIndividualEntryActions(
  individualEntryCrud: IndividualEntryCrud,
  data: AppData,
  selectedMeetId: string | null,
  callbacks: { showConfirm: (dialog: ConfirmDialogState) => void },
) {
  const addIndividualEntry = () => individualEntryCrud.addMany([blankIndividualEntry()]);

  const updateIndividualEntry = individualEntryCrud.update;

  const deleteIndividualEntry = individualEntryCrud.deleteById;

  const bulkAddIndividualEntries = (count: number, eventNames: string[]) =>
    individualEntryCrud.addMany(
      eventNames.flatMap((event) =>
        Array.from({ length: count }, () => blankIndividualEntry(event)),
      ),
    );

  const importIndividualEntriesCsv = (
    rows: { event: string; athleteId: string; seedTime: string }[],
  ) =>
    individualEntryCrud.addMany(
      rows.map((row) => ({ athleteId: row.athleteId, event: row.event, seedTime: row.seedTime })),
    );

  const clearAllIndividualEntries = () => {
    if (!selectedMeetId) return;
    const count = data.individualEntries.filter((e) => e.meetId === selectedMeetId).length;
    if (count === 0) return;
    callbacks.showConfirm({
      title: "Clear All Individual Entries",
      message: clearAllConfirmMessage(count, "individual entry", "individual entries"),
      confirmLabel: "Clear All",
      onConfirm: () => individualEntryCrud.clearForMeet(),
    });
  };

  return {
    addIndividualEntry,
    updateIndividualEntry,
    deleteIndividualEntry,
    bulkAddIndividualEntries,
    importIndividualEntriesCsv,
    clearAllIndividualEntries,
  };
}
