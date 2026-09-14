import type { AppData, RelayEntry } from "../types";

interface RelayEntryCrud {
  addMany: (items: Omit<RelayEntry, "id" | "meetId">[]) => void;
  update: (entry: RelayEntry) => void;
  deleteById: (id: string) => void;
  clearForMeet: (keepIds?: Set<string>) => void;
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

function blankRelayEntry(event = "", relayLetter = "A"): Omit<RelayEntry, "id" | "meetId"> {
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
  callbacks: { showConfirm: (dialog: ConfirmDialogState) => void },
) {
  const addRelayEntry = () => relayEntryCrud.addMany([blankRelayEntry()]);

  const updateRelayEntry = relayEntryCrud.update;

  const deleteRelayEntry = relayEntryCrud.deleteById;

  const bulkAddRelayEntries = (count: number, eventNames: string[]) =>
    relayEntryCrud.addMany(
      eventNames.flatMap((event) =>
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
        event: row.event,
        relayLetter: row.relayLetter,
        leg1AthleteId: row.leg1AthleteId,
        leg2AthleteId: row.leg2AthleteId,
        leg3AthleteId: row.leg3AthleteId,
        leg4AthleteId: row.leg4AthleteId,
        seedTime: row.seedTime,
      })),
    );

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
    clearAllRelayEntries,
  };
}
