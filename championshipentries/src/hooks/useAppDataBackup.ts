import { useState } from "react";
import type { AppData, Athlete, IndividualEntry, Meet, RelayEntry } from "../types";
import { downloadTextFile } from "../utils/csv";
import {
  appDataBackupFileName,
  buildAppDataBackup,
  parseAppDataBackup,
} from "../domain/appDataBackup";

interface History {
  update: (updater: (prev: AppData) => AppData) => void;
}

export type DuplicateMeetResolution = "keep" | "replace";

export interface DuplicateMeetRow {
  existingMeet: Meet;
  importedMeet: Meet;
  importedAthletes: Athlete[];
  importedIndividualEntries: IndividualEntry[];
  importedRelayEntries: RelayEntry[];
  resolution: DuplicateMeetResolution;
}

/**
 * Exports every meet, athlete, and entry to a single JSON file, and merges
 * one back in: meets not already present are added outright, and meets that
 * share an id with an existing one are surfaced via `duplicates` so the
 * caller can let the user choose, per meet, to keep the existing one or
 * replace it — applied all at once via `applyDuplicateResolutions`.
 */
export function useAppDataBackup(
  data: AppData,
  history: History,
  callbacks: {
    showInfo: (dialog: { title: string; message: string }) => void;
  },
) {
  const [duplicates, setDuplicates] = useState<DuplicateMeetRow[]>([]);

  const exportAllData = () => {
    const backup = buildAppDataBackup(data);
    downloadTextFile(appDataBackupFileName(), JSON.stringify(backup, null, 2), "application/json");
  };

  const importAllDataFile = (file: File) => {
    file
      .text()
      .then((text) => {
        const result = parseAppDataBackup(text);
        if ("error" in result) {
          callbacks.showInfo({ title: "Import Failed", message: result.error });
          return;
        }

        const existingMeetById = new Map(data.meets.map((m) => [m.id, m]));
        const newMeets = result.meets.filter((m) => !existingMeetById.has(m.id));
        const duplicateMeets = result.meets.filter((m) => existingMeetById.has(m.id));

        if (newMeets.length > 0) {
          const newMeetIds = new Set(newMeets.map((m) => m.id));
          history.update((prev) => ({
            meets: [...prev.meets, ...newMeets],
            athletes: [
              ...prev.athletes,
              ...result.athletes.filter((a) => newMeetIds.has(a.meetId)),
            ],
            individualEntries: [
              ...prev.individualEntries,
              ...result.individualEntries.filter((e) => newMeetIds.has(e.meetId)),
            ],
            relayEntries: [
              ...prev.relayEntries,
              ...result.relayEntries.filter((e) => newMeetIds.has(e.meetId)),
            ],
          }));
        }

        if (duplicateMeets.length > 0) {
          setDuplicates((prev) => [
            ...prev,
            ...duplicateMeets.map((importedMeet): DuplicateMeetRow => ({
              existingMeet: existingMeetById.get(importedMeet.id)!,
              importedMeet,
              importedAthletes: result.athletes.filter((a) => a.meetId === importedMeet.id),
              importedIndividualEntries: result.individualEntries.filter(
                (e) => e.meetId === importedMeet.id,
              ),
              importedRelayEntries: result.relayEntries.filter((e) => e.meetId === importedMeet.id),
              resolution: "keep",
            })),
          ]);
        }

        if (newMeets.length === 0 && duplicateMeets.length === 0) {
          callbacks.showInfo({ title: "Import All Data", message: "This backup has no meets." });
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Could not read this file.";
        callbacks.showInfo({
          title: "Import Failed",
          message: `Failed to read "${file.name}": ${message}`,
        });
      });
  };

  const setDuplicateResolution = (meetId: string, resolution: DuplicateMeetResolution) => {
    setDuplicates((prev) =>
      prev.map((d) => (d.importedMeet.id === meetId ? { ...d, resolution } : d)),
    );
  };

  const applyDuplicateResolutions = () => {
    const toReplace = duplicates.filter((d) => d.resolution === "replace");
    if (toReplace.length > 0) {
      const replacedMeetIds = new Set(toReplace.map((d) => d.importedMeet.id));
      const importedMeetById = new Map(toReplace.map((d) => [d.importedMeet.id, d.importedMeet]));
      history.update((prev) => ({
        meets: prev.meets.map((m) => importedMeetById.get(m.id) ?? m),
        athletes: [
          ...prev.athletes.filter((a) => !replacedMeetIds.has(a.meetId)),
          ...toReplace.flatMap((d) => d.importedAthletes),
        ],
        individualEntries: [
          ...prev.individualEntries.filter((e) => !replacedMeetIds.has(e.meetId)),
          ...toReplace.flatMap((d) => d.importedIndividualEntries),
        ],
        relayEntries: [
          ...prev.relayEntries.filter((e) => !replacedMeetIds.has(e.meetId)),
          ...toReplace.flatMap((d) => d.importedRelayEntries),
        ],
      }));
    }
    setDuplicates([]);
  };

  const cancelDuplicateResolutions = () => setDuplicates([]);

  return {
    exportAllData,
    importAllDataFile,
    duplicates,
    setDuplicateResolution,
    applyDuplicateResolutions,
    cancelDuplicateResolutions,
  };
}
