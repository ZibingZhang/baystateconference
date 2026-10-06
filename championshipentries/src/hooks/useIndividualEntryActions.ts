import type { AppData, IndividualEntry } from "../types";
import { matchEventAcrossMeets, parseEv3 } from "../domain/ev3";
import { resolveOrCopyAthletesForImport } from "../utils/athleteMatch";
import { newId } from "../utils/id";

interface IndividualEntryCrud {
  addMany: (items: Omit<IndividualEntry, "id" | "meetId">[]) => void;
  update: (entry: IndividualEntry) => void;
  deleteById: (id: string) => void;
  clearForMeet: (keepIds?: Set<string>) => void;
  reorder: (orderedIds: string[]) => void;
}

interface History {
  update: (updater: (prev: AppData) => AppData) => void;
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

function blankIndividualEntry(event = 0): Omit<IndividualEntry, "id" | "meetId"> {
  return { athleteId: "", event, seedTime: "" };
}

/** Individual entry CRUD wrapping the generic `useMeetCrud`. */
export function useIndividualEntryActions(
  individualEntryCrud: IndividualEntryCrud,
  data: AppData,
  selectedMeetId: string | null,
  history: History,
  callbacks: { showConfirm: (dialog: ConfirmDialogState) => void },
) {
  const addIndividualEntry = () => individualEntryCrud.addMany([blankIndividualEntry()]);

  const updateIndividualEntry = individualEntryCrud.update;

  const deleteIndividualEntry = individualEntryCrud.deleteById;

  const bulkAddIndividualEntries = (count: number, eventNumbers: number[]) =>
    individualEntryCrud.addMany(
      eventNumbers.flatMap((event) =>
        Array.from({ length: count }, () => blankIndividualEntry(event)),
      ),
    );

  const importIndividualEntriesCsv = (
    rows: { event: string; athleteId: string; seedTime: string }[],
  ) =>
    individualEntryCrud.addMany(
      rows.map((row) => ({
        athleteId: row.athleteId,
        event: Number.parseInt(row.event, 10) || 0,
        seedTime: row.seedTime,
      })),
    );

  const importIndividualEntriesFromMeet = (sourceMeetId: string, entryIds: string[]) => {
    if (!selectedMeetId) return;
    const idSet = new Set(entryIds);
    const toImport = data.individualEntries.filter(
      (e) => e.meetId === sourceMeetId && idSet.has(e.id),
    );
    if (toImport.length === 0) return;

    const sourceMeet = data.meets.find((m) => m.id === sourceMeetId);
    const destMeet = data.meets.find((m) => m.id === selectedMeetId);
    const sourceEvents = sourceMeet?.importedEventsRaw
      ? parseEv3(sourceMeet.importedEventsRaw).events
      : [];
    const destEvents = destMeet?.importedEventsRaw
      ? parseEv3(destMeet.importedEventsRaw).events
      : [];

    const { idMap, newAthletes } = resolveOrCopyAthletesForImport(
      toImport.map((e) => e.athleteId),
      data.athletes,
      selectedMeetId,
    );

    const newEntries: IndividualEntry[] = toImport.map((e) => ({
      id: newId(),
      meetId: selectedMeetId,
      athleteId: idMap.get(e.athleteId) ?? e.athleteId,
      event: matchEventAcrossMeets(e.event, sourceEvents, destEvents),
      seedTime: e.seedTime,
    }));

    history.update((prev) => ({
      ...prev,
      athletes: [...prev.athletes, ...newAthletes],
      individualEntries: [...prev.individualEntries, ...newEntries],
    }));
  };

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
    importIndividualEntriesFromMeet,
    clearAllIndividualEntries,
    reorderIndividualEntries: individualEntryCrud.reorder,
  };
}
