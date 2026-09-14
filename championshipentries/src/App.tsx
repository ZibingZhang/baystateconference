import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { useAppData } from "./storage";
import { useHistory } from "./useHistory";
import type {
  Athlete,
  Gender,
  HighSchool,
  ImportedEvent,
  IndividualEntry,
  Meet,
  RelayEntry,
} from "./types";
import { uniqueEventNames } from "./ev3";
import { buildHy3File, downloadHy3File } from "./hy3Export";
import { fetchHighSchools } from "./highSchools";
import {
  MEET_TEMPLATES,
  buildTemplateIndividualEntries,
  buildTemplateRelayEntries,
  fetchTemplateEvents,
  templateFileName,
} from "./meetTemplates";
import AppMenuBar from "./components/AppMenuBar";
import MeetSidebar from "./components/MeetSidebar";
import AddMeetDialog from "./components/AddMeetDialog";
import AboutDialog from "./components/AboutDialog";
import HowToPage from "./components/HowToPage";
import ConfirmDialog from "./components/ConfirmDialog";
import InfoDialog from "./components/InfoDialog";
import MeetTabsView from "./components/MeetTabsView";
import { MEET_TABS, type MeetTab } from "./meetTabs";
import { newId } from "./id";
import { useMeetCrud } from "./useMeetCrud";
import { athleteFullName } from "./athleteMatch";

const TEMPLATE_READ_ONLY_MESSAGE =
  "This is a template and cannot be edited. Make a copy of it into a new meet first.";

function clearAllConfirmMessage(count: number, singular: string, plural: string): string {
  return `Delete all ${count} ${count === 1 ? singular : plural}? This cannot be undone.`;
}

const RELAY_LETTERS = ["A", "B", "C", "D"];

function App() {
  const [data, setData] = useAppData();
  const history = useHistory(data, setData);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMeetId, setSelectedMeetId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("meet"),
  );
  const athleteCrud = useMeetCrud<Athlete>(history, selectedMeetId, {
    get: (d) => d.athletes,
    set: (prev, items) => ({ ...prev, athletes: items }),
  });
  const individualEntryCrud = useMeetCrud<IndividualEntry>(history, selectedMeetId, {
    get: (d) => d.individualEntries,
    set: (prev, items) => ({ ...prev, individualEntries: items }),
  });
  const relayEntryCrud = useMeetCrud<RelayEntry>(history, selectedMeetId, {
    get: (d) => d.relayEntries,
    set: (prev, items) => ({ ...prev, relayEntries: items }),
  });
  const [activeTab, setActiveTab] = useState<MeetTab>(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    return MEET_TABS.includes(tab as MeetTab) ? (tab as MeetTab) : "team";
  });
  const [addMeetOpen, setAddMeetOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  const [infoDialog, setInfoDialog] = useState<{ title: string; message: string } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateFetchState, setTemplateFetchState] = useState<
    | { templateId: string; status: "error"; message: string }
    | { templateId: string; status: "ready"; events: ImportedEvent[] }
    | null
  >(null);

  if (!howToOpen && !selectedTemplateId && !data.meets.some((m) => m.id === selectedMeetId)) {
    const fallbackMeetId = data.meets[0]?.id ?? null;
    if (fallbackMeetId !== selectedMeetId) {
      setSelectedMeetId(fallbackMeetId);
    }
  }

  const selectedTemplate = MEET_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? null;
  const templateData: { status: "loading" } | typeof templateFetchState = !selectedTemplate
    ? null
    : templateFetchState?.templateId === selectedTemplate.id
      ? templateFetchState
      : { status: "loading" };

  useEffect(() => {
    if (!selectedTemplate) return;
    let cancelled = false;
    fetchTemplateEvents(selectedTemplate.ev3Url)
      .then(({ events }) => {
        if (!cancelled)
          setTemplateFetchState({ templateId: selectedTemplate.id, status: "ready", events });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setTemplateFetchState({
            templateId: selectedTemplate.id,
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load template events.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTemplate]);

  const handleReadOnlyAttempt = () =>
    setInfoDialog({ title: "Template", message: TEMPLATE_READ_ONLY_MESSAGE });

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    setSelectedMeetId(null);
    setHowToOpen(false);
  };

  const handleCopyTemplateToMeet = (templateId: string) => {
    const template = MEET_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    fetchTemplateEvents(template.ev3Url)
      .then(({ events, rawText }) => {
        const newMeetId = newId();
        const meet: Meet = {
          id: newMeetId,
          name: template.name,
          importedEventsFileName: templateFileName(template.ev3Url),
          importedEvents: events,
          importedEventsRaw: rawText,
        };
        const newIndividualEntries = buildTemplateIndividualEntries(
          newMeetId,
          events,
          template.genderFilter,
          newId,
        );
        const newRelayEntries = buildTemplateRelayEntries(
          newMeetId,
          events,
          template.genderFilter,
          newId,
        );
        history.update((prev) => ({
          ...prev,
          meets: [...prev.meets, meet],
          individualEntries: [...prev.individualEntries, ...newIndividualEntries],
          relayEntries: [...prev.relayEntries, ...newRelayEntries],
        }));
        setSelectedTemplateId(null);
        setSelectedMeetId(newMeetId);
      })
      .catch((err: unknown) => {
        setInfoDialog({
          title: "Copy Failed",
          message: err instanceof Error ? err.message : "Failed to load template events.",
        });
      });
  };

  const templateEvents = templateData?.status === "ready" ? templateData.events : undefined;
  const templateIndividualEntries = useMemo(() => {
    if (!selectedTemplate || !templateEvents) return [];
    return buildTemplateIndividualEntries(
      selectedTemplate.id,
      templateEvents,
      selectedTemplate.genderFilter,
      newId,
    );
  }, [selectedTemplate, templateEvents]);
  const templateRelayEntries = useMemo(() => {
    if (!selectedTemplate || !templateEvents) return [];
    return buildTemplateRelayEntries(
      selectedTemplate.id,
      templateEvents,
      selectedTemplate.genderFilter,
      newId,
    );
  }, [selectedTemplate, templateEvents]);
  const templateIndividualEventOptions = templateEvents
    ? uniqueEventNames(templateEvents, false)
    : undefined;
  const templateRelayEventOptions = templateEvents
    ? uniqueEventNames(templateEvents, true)
    : undefined;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedMeetId) {
      params.set("meet", selectedMeetId);
    } else {
      params.delete("meet");
    }
    if (howToOpen) {
      params.delete("tab");
    } else {
      params.set("tab", activeTab);
    }
    const search = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`,
    );
  }, [selectedMeetId, activeTab, howToOpen]);

  const athletes = data.athletes.filter((a) => a.meetId === selectedMeetId);
  const individualEntries = data.individualEntries.filter((e) => e.meetId === selectedMeetId);
  const relayEntries = data.relayEntries.filter((e) => e.meetId === selectedMeetId);

  const handleAddMeet = (name: string) => {
    const meet = { id: newId(), name };
    history.update((prev) => ({ ...prev, meets: [...prev.meets, meet] }));
    setSelectedMeetId(meet.id);
    setHowToOpen(false);
  };

  const handleDeleteMeet = (id: string) => {
    const meet = data.meets.find((m) => m.id === id);
    if (!meet) return;
    setConfirmDialog({
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

  const handleCopyMeet = (id: string) => {
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
    setSelectedMeetId(newMeetId);
  };

  const handleRenameMeet = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    history.update((prev) => ({
      ...prev,
      meets: prev.meets.map((m) => (m.id === id ? { ...m, name: trimmed } : m)),
    }));
  };

  const handleUpdateTeamCode = (teamCode: string) => {
    if (!selectedMeetId) return;
    history.update((prev) => ({
      ...prev,
      meets: prev.meets.map((m) => (m.id === selectedMeetId ? { ...m, teamCode } : m)),
    }));
  };

  const blankAthlete = (): Omit<Athlete, "id" | "meetId"> => ({
    lastName: "",
    firstName: "",
    gender: "G",
    classYear: null,
  });

  const handleAddAthlete = () => athleteCrud.addMany([blankAthlete()]);

  const handleBulkAddAthletes = (count: number) =>
    athleteCrud.addMany(Array.from({ length: count }, blankAthlete));

  const handleImportAthletesCsv = (
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

  const handleUpdateAthlete = athleteCrud.update;

  const handleDeleteAthlete = (id: string) => {
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
      setInfoDialog({
        title: "Cannot Delete Athlete",
        message:
          "This athlete is used in an individual or relay entry. Remove those entries first.",
      });
      return;
    }

    const athlete = data.athletes.find((a) => a.id === id);
    const label = athlete ? athleteFullName(athlete) : "";
    setConfirmDialog({
      title: "Delete Athlete",
      message: `Delete ${label || "this athlete"}?`,
      onConfirm: () => athleteCrud.deleteById(id),
    });
  };

  const handleClearAllAthletes = () => {
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

    setConfirmDialog({
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

  const blankIndividualEntry = (event = ""): Omit<IndividualEntry, "id" | "meetId"> => ({
    athleteId: "",
    event,
    seedTime: "",
  });

  const handleAddIndividualEntry = () => individualEntryCrud.addMany([blankIndividualEntry()]);

  const handleUpdateIndividualEntry = individualEntryCrud.update;

  const handleDeleteIndividualEntry = individualEntryCrud.deleteById;

  const handleBulkAddIndividualEntries = (count: number, eventNames: string[]) =>
    individualEntryCrud.addMany(
      eventNames.flatMap((event) => Array.from({ length: count }, () => blankIndividualEntry(event))),
    );

  const handleImportIndividualEntriesCsv = (
    rows: { event: string; athleteId: string; seedTime: string }[],
  ) =>
    individualEntryCrud.addMany(
      rows.map((row) => ({ athleteId: row.athleteId, event: row.event, seedTime: row.seedTime })),
    );

  const handleClearAllIndividualEntries = () => {
    if (!selectedMeetId) return;
    const count = data.individualEntries.filter((e) => e.meetId === selectedMeetId).length;
    if (count === 0) return;
    setConfirmDialog({
      title: "Clear All Individual Entries",
      message: clearAllConfirmMessage(count, "individual entry", "individual entries"),
      confirmLabel: "Clear All",
      onConfirm: () => individualEntryCrud.clearForMeet(),
    });
  };

  const blankRelayEntry = (
    event = "",
    relayLetter = "A",
  ): Omit<RelayEntry, "id" | "meetId"> => ({
    event,
    relayLetter,
    leg1AthleteId: "",
    leg2AthleteId: "",
    leg3AthleteId: "",
    leg4AthleteId: "",
    seedTime: "",
  });

  const handleAddRelayEntry = () => relayEntryCrud.addMany([blankRelayEntry()]);

  const handleUpdateRelayEntry = relayEntryCrud.update;

  const handleDeleteRelayEntry = relayEntryCrud.deleteById;

  const handleBulkAddRelayEntries = (count: number, eventNames: string[]) =>
    relayEntryCrud.addMany(
      eventNames.flatMap((event) =>
        Array.from({ length: count }, (_, index) =>
          blankRelayEntry(event, RELAY_LETTERS[index % RELAY_LETTERS.length]),
        ),
      ),
    );

  const handleImportRelayEntriesCsv = (
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

  const handleClearAllRelayEntries = () => {
    if (!selectedMeetId) return;
    const count = data.relayEntries.filter((e) => e.meetId === selectedMeetId).length;
    if (count === 0) return;
    setConfirmDialog({
      title: "Clear All Relay Entries",
      message: clearAllConfirmMessage(count, "relay entry", "relay entries"),
      confirmLabel: "Clear All",
      onConfirm: () => relayEntryCrud.clearForMeet(),
    });
  };

  const handleImportEvents = (fileName: string, events: ImportedEvent[], rawText: string) => {
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

  const handleClearImportedEvents = () => {
    if (!selectedMeetId) return;
    setConfirmDialog({
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

  const handleExportHy3 = () => {
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
        setInfoDialog({ title: "Cannot Export", message: result.error });
        return;
      }
      downloadHy3File(result.fileName, result.content);
      const skippedTotal = result.skippedIndividualEntries + result.skippedRelayEntries;
      if (skippedTotal > 0) {
        setInfoDialog({
          title: "Exported with Skipped Entries",
          message:
            `${result.fileName} was downloaded, but ${skippedTotal} ` +
            `${skippedTotal === 1 ? "entry was" : "entries were"} skipped because its athlete or ` +
            "event could not be matched (missing athlete, incomplete relay leg, or event not found " +
            "in the imported EV3 file).",
        });
      }
    };

    if (!meet.teamCode) {
      build(undefined);
      return;
    }
    fetchHighSchools()
      .then((highSchools) => build(highSchools.find((h) => h.code === meet.teamCode)))
      .catch(() => build(undefined));
  };

  const selectedMeet = data.meets.find((m) => m.id === selectedMeetId) ?? null;
  const individualEventOptions = selectedMeet?.importedEvents
    ? uniqueEventNames(selectedMeet.importedEvents, false)
    : undefined;
  const relayEventOptions = selectedMeet?.importedEvents
    ? uniqueEventNames(selectedMeet.importedEvents, true)
    : undefined;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <AppMenuBar
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onNewMeet={() => setAddMeetOpen(true)}
        onExportHy3={handleExportHy3}
        exportDisabled={!selectedMeet}
        onHowTo={() => {
          setSelectedMeetId(null);
          setSelectedTemplateId(null);
          setHowToOpen(true);
        }}
        onAbout={() => setAboutOpen(true)}
        onUndo={history.undo}
        onRedo={history.redo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
      />
      <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
        <MeetSidebar
          open={sidebarOpen}
          meets={data.meets}
          selectedMeetId={selectedMeetId}
          onSelectMeet={(id) => {
            setSelectedMeetId(id);
            setSelectedTemplateId(null);
            setHowToOpen(false);
          }}
          onAddMeet={() => setAddMeetOpen(true)}
          onDeleteMeet={handleDeleteMeet}
          onCopyMeet={handleCopyMeet}
          onRenameMeet={handleRenameMeet}
          templates={MEET_TEMPLATES}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={handleSelectTemplate}
          onCopyTemplate={handleCopyTemplateToMeet}
        />
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {howToOpen ? (
            <HowToPage />
          ) : selectedTemplate ? (
            <>
              <Alert severity="info" sx={{ borderRadius: 0 }}>
                {TEMPLATE_READ_ONLY_MESSAGE}
              </Alert>
              {templateData?.status === "loading" && (
                <Box
                  sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <CircularProgress />
                </Box>
              )}
              {templateData?.status === "error" && (
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 2,
                  }}
                >
                  <Typography color="error">{templateData.message}</Typography>
                </Box>
              )}
              {templateData?.status === "ready" && (
                <MeetTabsView
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  readOnly
                  onReadOnlyAttempt={handleReadOnlyAttempt}
                  teamCode={undefined}
                  athletes={[]}
                  individualEntries={templateIndividualEntries}
                  relayEntries={templateRelayEntries}
                  individualEventOptions={templateIndividualEventOptions}
                  relayEventOptions={templateRelayEventOptions}
                  importedEvents={templateEvents}
                  eventsFileName={templateFileName(selectedTemplate.ev3Url)}
                />
              )}
            </>
          ) : selectedMeet ? (
            <MeetTabsView
              activeTab={activeTab}
              onTabChange={setActiveTab}
              teamCode={selectedMeet.teamCode}
              onUpdateTeamCode={handleUpdateTeamCode}
              athletes={athletes}
              individualEntries={individualEntries}
              relayEntries={relayEntries}
              onAddAthlete={handleAddAthlete}
              onBulkAddAthletes={handleBulkAddAthletes}
              onImportAthletesCsv={handleImportAthletesCsv}
              onUpdateAthlete={handleUpdateAthlete}
              onDeleteAthlete={handleDeleteAthlete}
              onClearAllAthletes={handleClearAllAthletes}
              individualEventOptions={individualEventOptions}
              relayEventOptions={relayEventOptions}
              importedEvents={selectedMeet.importedEvents}
              onAddIndividualEntry={handleAddIndividualEntry}
              onBulkAddIndividualEntries={handleBulkAddIndividualEntries}
              onImportIndividualEntriesCsv={handleImportIndividualEntriesCsv}
              onUpdateIndividualEntry={handleUpdateIndividualEntry}
              onDeleteIndividualEntry={handleDeleteIndividualEntry}
              onClearAllIndividualEntries={handleClearAllIndividualEntries}
              onAddRelayEntry={handleAddRelayEntry}
              onBulkAddRelayEntries={handleBulkAddRelayEntries}
              onImportRelayEntriesCsv={handleImportRelayEntriesCsv}
              onUpdateRelayEntry={handleUpdateRelayEntry}
              onDeleteRelayEntry={handleDeleteRelayEntry}
              onClearAllRelayEntries={handleClearAllRelayEntries}
              eventsFileName={selectedMeet.importedEventsFileName}
              onImportEvents={handleImportEvents}
              onImportEventsError={(message) => setInfoDialog({ title: "Import Failed", message })}
              onClearImportedEvents={handleClearImportedEvents}
            />
          ) : (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography color="text.secondary">Create a meet to get started</Typography>
            </Box>
          )}
        </Box>
      </Box>
      <AddMeetDialog
        open={addMeetOpen}
        onClose={() => setAddMeetOpen(false)}
        onCreate={handleAddMeet}
      />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ""}
        message={confirmDialog?.message ?? ""}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={() => confirmDialog?.onConfirm()}
        onClose={() => setConfirmDialog(null)}
      />
      <InfoDialog
        open={infoDialog !== null}
        title={infoDialog?.title ?? ""}
        message={infoDialog?.message ?? ""}
        onClose={() => setInfoDialog(null)}
      />
    </Box>
  );
}

export default App;
