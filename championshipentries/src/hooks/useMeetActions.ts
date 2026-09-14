import type { AppData, Athlete, IndividualEntry, Meet, RelayEntry } from "../types";
import { newId } from "../utils/id";

interface History {
  update: (updater: (prev: AppData) => AppData) => void;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

/** Meet-level CRUD: create, delete (with confirm), copy, rename, and team-code updates. */
export function useMeetActions(
  data: AppData,
  history: History,
  selectedMeetId: string | null,
  callbacks: {
    setSelectedMeetId: (id: string | null) => void;
    setHowToOpen: (open: boolean) => void;
    showConfirm: (dialog: ConfirmDialogState) => void;
  },
) {
  const addMeet = (name: string) => {
    const meet = { id: newId(), name };
    history.update((prev) => ({ ...prev, meets: [...prev.meets, meet] }));
    callbacks.setSelectedMeetId(meet.id);
    callbacks.setHowToOpen(false);
  };

  const deleteMeet = (id: string) => {
    const meet = data.meets.find((m) => m.id === id);
    if (!meet) return;
    callbacks.showConfirm({
      title: "Delete Meet",
      message: `Delete meet "${meet.name}" and all of its data? This cannot be undone.`,
      onConfirm: () => {
        history.update((prev) => ({
          meets: prev.meets.filter((m) => m.id !== id),
          athletes: prev.athletes.filter((a) => a.meetId !== id),
          individualEntries: prev.individualEntries.filter((e) => e.meetId !== id),
          relayEntries: prev.relayEntries.filter((e) => e.meetId !== id),
        }));
      },
    });
  };

  const copyMeet = (id: string) => {
    const meet = data.meets.find((m) => m.id === id);
    if (!meet) return;

    const newMeetId = newId();
    const athleteIdMap = new Map<string, string>();
    const newAthletes: Athlete[] = data.athletes
      .filter((a) => a.meetId === id)
      .map((a) => {
        const newAthleteId = newId();
        athleteIdMap.set(a.id, newAthleteId);
        return { ...a, id: newAthleteId, meetId: newMeetId };
      });
    const remapAthleteId = (athleteId: string) => athleteIdMap.get(athleteId) ?? athleteId;
    const newIndividualEntries: IndividualEntry[] = data.individualEntries
      .filter((e) => e.meetId === id)
      .map((e) => ({
        ...e,
        id: newId(),
        meetId: newMeetId,
        athleteId: remapAthleteId(e.athleteId),
      }));
    const newRelayEntries: RelayEntry[] = data.relayEntries
      .filter((e) => e.meetId === id)
      .map((e) => ({
        ...e,
        id: newId(),
        meetId: newMeetId,
        leg1AthleteId: remapAthleteId(e.leg1AthleteId),
        leg2AthleteId: remapAthleteId(e.leg2AthleteId),
        leg3AthleteId: remapAthleteId(e.leg3AthleteId),
        leg4AthleteId: remapAthleteId(e.leg4AthleteId),
      }));
    const newMeet: Meet = { ...meet, id: newMeetId, name: `${meet.name} (copy)` };

    history.update((prev) => ({
      meets: [...prev.meets, newMeet],
      athletes: [...prev.athletes, ...newAthletes],
      individualEntries: [...prev.individualEntries, ...newIndividualEntries],
      relayEntries: [...prev.relayEntries, ...newRelayEntries],
    }));
    callbacks.setSelectedMeetId(newMeetId);
  };

  const renameMeet = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    history.update((prev) => ({
      ...prev,
      meets: prev.meets.map((m) => (m.id === id ? { ...m, name: trimmed } : m)),
    }));
  };

  const updateTeamCode = (teamCode: string) => {
    if (!selectedMeetId) return;
    history.update((prev) => ({
      ...prev,
      meets: prev.meets.map((m) => (m.id === selectedMeetId ? { ...m, teamCode } : m)),
    }));
  };

  return { addMeet, deleteMeet, copyMeet, renameMeet, updateTeamCode };
}
