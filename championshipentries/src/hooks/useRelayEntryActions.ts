import type { AppData, RelayEntry } from "../types";
import { matchEventAcrossMeets, parseEv3 } from "../domain/ev3";
import { resolveOrCopyAthletesForImport } from "../utils/athleteMatch";
import { newId } from "../utils/id";

interface RelayEntryCrud {
  addMany: (items: Omit<RelayEntry, "id" | "meetId">[]) => void;
  update: (entry: RelayEntry) => void;
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

const RELAY_LETTERS = ["A", "B", "C", "D"];

function clearAllConfirmMessage(count: number, singular: string, plural: string): string {
  return `Delete all ${count} ${count === 1 ? singular : plural}? This cannot be undone.`;
}

function blankRelayEntry(event = 0, relayLetter = "A"): Omit<RelayEntry, "id" | "meetId"> {
  return {
    event,
    relayLetter,
    leg1AthleteId: "",
    leg2AthleteId: "",
    leg3AthleteId: "",
    leg4AthleteId: "",
    seedTime: "",
  };
}

/** Relay entry CRUD wrapping the generic `useMeetCrud`. */
export function useRelayEntryActions(
  relayEntryCrud: RelayEntryCrud,
  data: AppData,
  selectedMeetId: string | null,
  history: History,
  callbacks: { showConfirm: (dialog: ConfirmDialogState) => void },
) {
  const addRelayEntry = () => relayEntryCrud.addMany([blankRelayEntry()]);

  const updateRelayEntry = relayEntryCrud.update;

  const deleteRelayEntry = relayEntryCrud.deleteById;

  const bulkAddRelayEntries = (count: number, eventNumbers: number[]) =>
    relayEntryCrud.addMany(
      eventNumbers.flatMap((event) =>
        Array.from({ length: count }, (_, index) =>
          blankRelayEntry(event, RELAY_LETTERS[index % RELAY_LETTERS.length]),
        ),
      ),
    );

  const importRelayEntriesCsv = (
    rows: {
      event: string;
      relayLetter: string;
      leg1AthleteId: string;
      leg2AthleteId: string;
      leg3AthleteId: string;
      leg4AthleteId: string;
      seedTime: string;
    }[],
  ) =>
    relayEntryCrud.addMany(
      rows.map((row) => ({
        event: Number.parseInt(row.event, 10) || 0,
        relayLetter: row.relayLetter,
        leg1AthleteId: row.leg1AthleteId,
        leg2AthleteId: row.leg2AthleteId,
        leg3AthleteId: row.leg3AthleteId,
        leg4AthleteId: row.leg4AthleteId,
        seedTime: row.seedTime,
      })),
    );

  const importRelayEntriesFromMeet = (sourceMeetId: string, entryIds: string[]) => {
    if (!selectedMeetId) return;
    const idSet = new Set(entryIds);
    const toImport = data.relayEntries.filter((e) => e.meetId === sourceMeetId && idSet.has(e.id));
    if (toImport.length === 0) return;

    const sourceMeet = data.meets.find((m) => m.id === sourceMeetId);
    const destMeet = data.meets.find((m) => m.id === selectedMeetId);
    const sourceEvents = sourceMeet?.importedEventsRaw
      ? parseEv3(sourceMeet.importedEventsRaw).events
      : [];
    const destEvents = destMeet?.importedEventsRaw
      ? parseEv3(destMeet.importedEventsRaw).events
      : [];

    const sourceAthleteIds = toImport.flatMap((e) => [
      e.leg1AthleteId,
      e.leg2AthleteId,
      e.leg3AthleteId,
      e.leg4AthleteId,
    ]);
    const { idMap, newAthletes } = resolveOrCopyAthletesForImport(
      sourceAthleteIds,
      data.athletes,
      selectedMeetId,
    );
    const remap = (athleteId: string) =>
      athleteId ? (idMap.get(athleteId) ?? athleteId) : athleteId;

    const newEntries: RelayEntry[] = toImport.map((e) => ({
      id: newId(),
      meetId: selectedMeetId,
      event: matchEventAcrossMeets(e.event, sourceEvents, destEvents),
      relayLetter: e.relayLetter,
      leg1AthleteId: remap(e.leg1AthleteId),
      leg2AthleteId: remap(e.leg2AthleteId),
      leg3AthleteId: remap(e.leg3AthleteId),
      leg4AthleteId: remap(e.leg4AthleteId),
      seedTime: e.seedTime,
    }));

    history.update((prev) => ({
      ...prev,
      athletes: [...prev.athletes, ...newAthletes],
      relayEntries: [...prev.relayEntries, ...newEntries],
    }));
  };

  const clearAllRelayEntries = () => {
    if (!selectedMeetId) return;
    const count = data.relayEntries.filter((e) => e.meetId === selectedMeetId).length;
    if (count === 0) return;
    callbacks.showConfirm({
      title: "Clear All Relay Entries",
      message: clearAllConfirmMessage(count, "relay entry", "relay entries"),
      confirmLabel: "Clear All",
      onConfirm: () => relayEntryCrud.clearForMeet(),
    });
  };

  return {
    addRelayEntry,
    updateRelayEntry,
    deleteRelayEntry,
    bulkAddRelayEntries,
    importRelayEntriesCsv,
    importRelayEntriesFromMeet,
    clearAllRelayEntries,
    reorderRelayEntries: relayEntryCrud.reorder,
  };
}
