import { useState } from "react";
import type { AppData, HighSchool, ImportedEvent } from "../types";
import {
  buildExportReview,
  buildHy3File,
  downloadHy3File,
  type ExportReview,
} from "../domain/hy3Export";
import { fetchHighSchools } from "../domain/highSchools";

interface History {
  update: (updater: (prev: AppData) => AppData) => void;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

/** Owns the imported EV3 event list (import/clear) and exporting the selected meet to HY3. */
export function useHy3Export(
  data: AppData,
  history: History,
  selectedMeetId: string | null,
  callbacks: {
    showInfo: (dialog: { title: string; message: string }) => void;
    showConfirm: (dialog: ConfirmDialogState) => void;
  },
) {
  const [exportReview, setExportReview] = useState<ExportReview | null>(null);

  const importEvents = (fileName: string, events: ImportedEvent[], rawText: string) => {
    if (!selectedMeetId) return;
    history.update((prev) => ({
      ...prev,
      meets: prev.meets.map((m) =>
        m.id === selectedMeetId
          ? {
              ...m,
              importedEventsFileName: fileName,
              importedEvents: events,
              importedEventsRaw: rawText,
            }
          : m,
      ),
    }));
  };

  const clearImportedEvents = () => {
    if (!selectedMeetId) return;
    callbacks.showConfirm({
      title: "Clear Imported Events",
      message:
        "This will remove the imported EV3 event list for this meet. The event name options " +
        "used by individual and relay entries will disappear until you re-import the file. " +
        "Existing entries are not deleted, but you will not be able to add new ones with the " +
        "correct event names until you re-import. This cannot be undone.",
      confirmLabel: "Clear Import",
      onConfirm: () => {
        history.update((prev) => ({
          ...prev,
          meets: prev.meets.map((m) =>
            m.id === selectedMeetId
              ? {
                  ...m,
                  importedEventsFileName: undefined,
                  importedEvents: undefined,
                  importedEventsRaw: undefined,
                }
              : m,
          ),
        }));
      },
    });
  };

  /** Opens the pre-export review panel, or an error dialog if export isn't possible at all yet. */
  const requestExport = () => {
    const meet = data.meets.find((m) => m.id === selectedMeetId);
    if (!meet) return;
    const meetAthletes = data.athletes.filter((a) => a.meetId === meet.id);
    const meetIndividualEntries = data.individualEntries.filter((e) => e.meetId === meet.id);
    const meetRelayEntries = data.relayEntries.filter((e) => e.meetId === meet.id);

    const review = buildExportReview(meet, meetAthletes, meetIndividualEntries, meetRelayEntries);
    if ("error" in review) {
      callbacks.showInfo({ title: "Cannot Export", message: review.error });
      return;
    }
    setExportReview(review);
  };

  const closeExportReview = () => setExportReview(null);

  /** Builds and downloads the HY3 file after the user has confirmed the review panel. */
  const confirmExport = () => {
    setExportReview(null);
    const meet = data.meets.find((m) => m.id === selectedMeetId);
    if (!meet) return;
    const meetAthletes = data.athletes.filter((a) => a.meetId === meet.id);
    const meetIndividualEntries = data.individualEntries.filter((e) => e.meetId === meet.id);
    const meetRelayEntries = data.relayEntries.filter((e) => e.meetId === meet.id);

    const build = (highSchool: HighSchool | undefined) => {
      const result = buildHy3File(
        meet,
        meetAthletes,
        meetIndividualEntries,
        meetRelayEntries,
        highSchool,
      );
      if ("error" in result) {
        callbacks.showInfo({ title: "Cannot Export", message: result.error });
        return;
      }
      downloadHy3File(result.fileName, result.content);
    };

    if (!meet.teamCode) {
      build(undefined);
      return;
    }
    fetchHighSchools()
      .then((highSchools) => build(highSchools.find((h) => h.code === meet.teamCode)))
      .catch(() => build(undefined));
  };

  return {
    importEvents,
    clearImportedEvents,
    requestExport,
    exportReview,
    closeExportReview,
    confirmExport,
  };
}
