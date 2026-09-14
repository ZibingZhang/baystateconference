import type { AppData, Athlete, Gender } from "../types";
import { athleteFullName } from "../utils/athleteMatch";

interface AthleteCrud {
  addMany: (items: Omit<Athlete, "id" | "meetId">[]) => void;
  update: (athlete: Athlete) => void;
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

function blankAthlete(): Omit<Athlete, "id" | "meetId"> {
  return { lastName: "", firstName: "", gender: "G", classYear: null };
}

/** Athlete CRUD wrapping the generic `useMeetCrud` with athlete-specific rules. */
export function useAthleteActions(
  athleteCrud: AthleteCrud,
  data: AppData,
  selectedMeetId: string | null,
  callbacks: {
    showConfirm: (dialog: ConfirmDialogState) => void;
    showInfo: (dialog: { title: string; message: string }) => void;
  },
) {
  const addAthlete = () => athleteCrud.addMany([blankAthlete()]);

  const bulkAddAthletes = (count: number) =>
    athleteCrud.addMany(Array.from({ length: count }, blankAthlete));

  const importAthletesCsv = (
    rows: { firstName: string; lastName: string; gender: string; classYear: string }[],
  ) =>
    athleteCrud.addMany(
      rows.map((row) => ({
        firstName: row.firstName,
        lastName: row.lastName,
        gender: row.gender as Gender,
        classYear: Number.parseInt(row.classYear, 10),
      })),
    );

  const updateAthlete = athleteCrud.update;

  const deleteAthlete = (id: string) => {
    const inUse =
      data.individualEntries.some((e) => e.athleteId === id) ||
      data.relayEntries.some(
        (e) =>
          e.leg1AthleteId === id ||
          e.leg2AthleteId === id ||
          e.leg3AthleteId === id ||
          e.leg4AthleteId === id,
      );
    if (inUse) {
      callbacks.showInfo({
        title: "Cannot Delete Athlete",
        message:
          "This athlete is used in an individual or relay entry. Remove those entries first.",
      });
      return;
    }

    const athlete = data.athletes.find((a) => a.id === id);
    const label = athlete ? athleteFullName(athlete) : "";
    callbacks.showConfirm({
      title: "Delete Athlete",
      message: `Delete ${label || "this athlete"}?`,
      onConfirm: () => athleteCrud.deleteById(id),
    });
  };

  const clearAllAthletes = () => {
    if (!selectedMeetId) return;
    const referencedIds = new Set<string>();
    data.individualEntries.forEach((e) => {
      if (e.meetId === selectedMeetId && e.athleteId) referencedIds.add(e.athleteId);
    });
    data.relayEntries.forEach((e) => {
      if (e.meetId !== selectedMeetId) return;
      [e.leg1AthleteId, e.leg2AthleteId, e.leg3AthleteId, e.leg4AthleteId].forEach((id) => {
        if (id) referencedIds.add(id);
      });
    });
    const meetAthletes = data.athletes.filter((a) => a.meetId === selectedMeetId);
    if (meetAthletes.length === 0) return;
    const clearableCount = meetAthletes.filter((a) => !referencedIds.has(a.id)).length;
    const skippedCount = meetAthletes.length - clearableCount;

    callbacks.showConfirm({
      title: "Clear All Athletes",
      message:
        skippedCount > 0
          ? `Delete ${clearableCount} of ${meetAthletes.length} athletes? ${skippedCount} ` +
            `${skippedCount === 1 ? "athlete is" : "athletes are"} still referenced in individual ` +
            "or relay entries and will not be cleared. This cannot be undone."
          : clearAllConfirmMessage(meetAthletes.length, "athlete", "athletes"),
      confirmLabel: "Clear All",
      onConfirm: () => athleteCrud.clearForMeet(referencedIds),
    });
  };

  return {
    addAthlete,
    bulkAddAthletes,
    importAthletesCsv,
    updateAthlete,
    deleteAthlete,
    clearAllAthletes,
  };
}
