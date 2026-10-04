import type { AppData, Athlete, IndividualEntry, Meet, RelayEntry } from "../types";
import { newId } from "../utils/id";
import { downloadTextFile } from "../utils/csv";
import { buildMeetBackup, meetBackupFileName, parseMeetBackup } from "../domain/meetBackup";

interface History {
  update: (updater: (prev: AppData) => AppData) => void;
}

/** Exports a single meet (with its athletes and entries) to a JSON file, and imports one back as a new meet. */
export function useMeetBackup(
  data: AppData,
  history: History,
  callbacks: {
    setSelectedMeetId: (id: string | null) => void;
    showInfo: (dialog: { title: string; message: string }) => void;
  },
) {
  const exportMeet = (id: string) => {
    const meet = data.meets.find((m) => m.id === id);
    if (!meet) return;
    const meetAthletes = data.athletes.filter((a) => a.meetId === id);
    const meetIndividualEntries = data.individualEntries.filter((e) => e.meetId === id);
    const meetRelayEntries = data.relayEntries.filter((e) => e.meetId === id);
    const backup = buildMeetBackup(meet, meetAthletes, meetIndividualEntries, meetRelayEntries);
    downloadTextFile(
      meetBackupFileName(meet.name),
      JSON.stringify(backup, null, 2),
      "application/json",
    );
  };

  const importMeetFile = (file: File) => {
    file
      .text()
      .then((text) => {
        const result = parseMeetBackup(text);
        if ("error" in result) {
          callbacks.showInfo({ title: "Import Failed", message: result.error });
          return;
        }

        const newMeetId = newId();
        const athleteIdMap = new Map<string, string>();
        const newAthletes: Athlete[] = result.athletes.map((a) => {
          const newAthleteId = newId();
          athleteIdMap.set(a.id, newAthleteId);
          return { ...a, id: newAthleteId, meetId: newMeetId };
        });
        const remapAthleteId = (athleteId: string) => athleteIdMap.get(athleteId) ?? athleteId;
        const newIndividualEntries: IndividualEntry[] = result.individualEntries.map((e) => ({
          ...e,
          id: newId(),
          meetId: newMeetId,
          athleteId: remapAthleteId(e.athleteId),
        }));
        const newRelayEntries: RelayEntry[] = result.relayEntries.map((e) => ({
          ...e,
          id: newId(),
          meetId: newMeetId,
          leg1AthleteId: remapAthleteId(e.leg1AthleteId),
          leg2AthleteId: remapAthleteId(e.leg2AthleteId),
          leg3AthleteId: remapAthleteId(e.leg3AthleteId),
          leg4AthleteId: remapAthleteId(e.leg4AthleteId),
        }));
        const newMeet: Meet = { ...result.meet, id: newMeetId };

        history.update((prev) => ({
          meets: [...prev.meets, newMeet],
          athletes: [...prev.athletes, ...newAthletes],
          individualEntries: [...prev.individualEntries, ...newIndividualEntries],
          relayEntries: [...prev.relayEntries, ...newRelayEntries],
        }));
        callbacks.setSelectedMeetId(newMeetId);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Could not read this file.";
        callbacks.showInfo({
          title: "Import Failed",
          message: `Failed to read "${file.name}": ${message}`,
        });
      });
  };

  return { exportMeet, importMeetFile };
}
