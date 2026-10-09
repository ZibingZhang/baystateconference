import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { useAppData } from "./storage";
import { useHistory } from "./hooks/useHistory";
import type { Athlete, IndividualEntry, RelayEntry } from "./types";
import { parseEv3, uniqueEventOptions } from "./domain/ev3";
import { MEET_TEMPLATES, templateFileName } from "./domain/meetTemplates";
import AppMenuBar from "./components/AppMenuBar";
import MeetSidebar from "./components/MeetSidebar";
import AddMeetDialog from "./components/AddMeetDialog";
import RenameMeetDialog from "./components/RenameMeetDialog";
import ImportDuplicateMeetsDialog from "./components/ImportDuplicateMeetsDialog";
import AboutPage from "./components/AboutPage";
import HowToPage from "./components/HowToPage";
import ConfirmDialog from "./components/ConfirmDialog";
import InfoDialog from "./components/InfoDialog";
import ExportReviewDialog from "./components/ExportReviewDialog";
import MeetTabsView from "./components/MeetTabsView";
import { useMeetCrud } from "./hooks/useMeetCrud";
import { useDialogState } from "./hooks/useDialogState";
import { useMeetUrlState } from "./hooks/useMeetUrlState";
import type { Page } from "./hooks/useMeetUrlState";
import { useTemplatePreview, TEMPLATE_READ_ONLY_MESSAGE } from "./hooks/useTemplatePreview";
import { useMeetActions } from "./hooks/useMeetActions";
import { useAthleteActions } from "./hooks/useAthleteActions";
import { useIndividualEntryActions } from "./hooks/useIndividualEntryActions";
import { useRelayEntryActions } from "./hooks/useRelayEntryActions";
import { useHy3Export } from "./hooks/useHy3Export";
import { useMeetBackup } from "./hooks/useMeetBackup";
import { useAppDataBackup } from "./hooks/useAppDataBackup";

function App() {
  const [data, setData] = useAppData();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [addMeetOpen, setAddMeetOpen] = useState(false);
  const [renameMeetOpen, setRenameMeetOpen] = useState(false);

  const { confirmDialog, showConfirm, closeConfirm, infoDialog, showInfo, closeInfo } =
    useDialogState();
  const { selectedMeetId, setSelectedMeetId, activeTab, setActiveTab, clearTab, view, setView } =
    useMeetUrlState();

  // `setPage` needs `template.clearTemplate` (so undo/redo navigating onto a
  // real meet page also drops an open template preview), but `template` is
  // constructed from `history` below — so the setter is threaded through a
  // ref, refreshed every render, to break the circularity.
  const setPageRef = useRef<(page: Page) => void>(() => {});
  const history = useHistory(data, setData, {
    get: () => ({ meetId: selectedMeetId, tab: activeTab, view }),
    set: (page) => setPageRef.current(page),
  });

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

  const template = useTemplatePreview(history, { setSelectedMeetId, setView, showInfo });
  const meetActions = useMeetActions(data, history, selectedMeetId, {
    setSelectedMeetId,
    setView,
    showConfirm,
  });
  const athleteActions = useAthleteActions(athleteCrud, data, selectedMeetId, {
    showConfirm,
    showInfo,
  });
  const individualEntryActions = useIndividualEntryActions(
    individualEntryCrud,
    data,
    selectedMeetId,
    history,
    { showConfirm },
  );
  const relayEntryActions = useRelayEntryActions(relayEntryCrud, data, selectedMeetId, history, {
    showConfirm,
  });
  const hy3Export = useHy3Export(data, history, selectedMeetId, { showInfo, showConfirm });
  const meetBackup = useMeetBackup(data, history, { setSelectedMeetId, showInfo });
  const appDataBackup = useAppDataBackup(data, history, { showInfo });
  const { selectedTemplateId, selectedTemplate, templateData } = template;

  useEffect(() => {
    setPageRef.current = (page) => {
      template.clearTemplate();
      setSelectedMeetId(page.view ? null : page.meetId);
      setActiveTab(page.tab);
      setView(page.view);
    };
  });

  if (!view && !selectedTemplateId && !data.meets.some((m) => m.id === selectedMeetId)) {
    const fallbackMeetId = data.meets[0]?.id ?? null;
    if (fallbackMeetId !== selectedMeetId) {
      setSelectedMeetId(fallbackMeetId);
      clearTab();
    }
  }

  const athletes = data.athletes.filter((a) => a.meetId === selectedMeetId);
  const individualEntries = data.individualEntries.filter((e) => e.meetId === selectedMeetId);
  const relayEntries = data.relayEntries.filter((e) => e.meetId === selectedMeetId);

  const selectedMeet = data.meets.find((m) => m.id === selectedMeetId) ?? null;
  const otherMeets = data.meets
    .filter((m) => m.id !== selectedMeetId)
    .map((m) => ({ id: m.id, name: m.name, importedEventsRaw: m.importedEventsRaw }));
  const importedEvents = useMemo(
    () =>
      selectedMeet?.importedEventsRaw ? parseEv3(selectedMeet.importedEventsRaw).events : undefined,
    [selectedMeet],
  );
  const individualEventOptions = importedEvents
    ? uniqueEventOptions(importedEvents, false)
    : undefined;
  const relayEventOptions = importedEvents ? uniqueEventOptions(importedEvents, true) : undefined;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <AppMenuBar
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onNewMeet={() => setAddMeetOpen(true)}
        onRenameMeet={() => setRenameMeetOpen(true)}
        onCopyMeet={() => selectedMeet && meetActions.copyMeet(selectedMeet.id)}
        onImportMeetFile={meetBackup.importMeetFile}
        onExportMeetBackup={() => selectedMeet && meetBackup.exportMeet(selectedMeet.id)}
        onDeleteMeet={() => selectedMeet && meetActions.deleteMeet(selectedMeet.id)}
        onExportHy3={hy3Export.requestExport}
        onExportAllData={appDataBackup.exportAllData}
        onImportAllDataFile={appDataBackup.importAllDataFile}
        onCopyTemplate={() => selectedTemplateId && template.copyTemplateToMeet(selectedTemplateId)}
        hasSelectedMeet={Boolean(selectedMeet)}
        hasSelectedTemplate={Boolean(selectedTemplateId)}
        onHowTo={() => {
          setSelectedMeetId(null);
          template.clearTemplate();
          setView("howto");
        }}
        onAbout={() => {
          setSelectedMeetId(null);
          template.clearTemplate();
          setView("about");
        }}
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
            template.clearTemplate();
            setView(null);
          }}
          onAddMeet={() => setAddMeetOpen(true)}
          onDeleteMeet={meetActions.deleteMeet}
          onRenameMeet={meetActions.renameMeet}
          templates={MEET_TEMPLATES}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={template.selectTemplate}
          onCopyTemplate={template.copyTemplateToMeet}
        />
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {view === "howto" ? (
            <HowToPage />
          ) : view === "about" ? (
            <AboutPage />
          ) : selectedTemplate ? (
            <>
              <Alert severity="info" variant="filled" sx={{ borderRadius: 0 }}>
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
                  onReadOnlyAttempt={template.handleReadOnlyAttempt}
                  meetId={selectedTemplate.id}
                  meetName={selectedTemplate.name}
                  teamCode={undefined}
                  importedEventsRaw={templateData.rawText}
                  athletes={[]}
                  allAthletes={[]}
                  otherMeets={[]}
                  individualEntries={template.templateIndividualEntries}
                  allIndividualEntries={template.templateIndividualEntries}
                  relayEntries={template.templateRelayEntries}
                  allRelayEntries={template.templateRelayEntries}
                  individualEventOptions={template.templateIndividualEventOptions}
                  relayEventOptions={template.templateRelayEventOptions}
                  importedEvents={templateData.events}
                  eventsFileName={templateFileName(selectedTemplate.ev3Url)}
                  athleteEventLimits={selectedTemplate}
                  eventEntryLimits={selectedTemplate}
                />
              )}
            </>
          ) : selectedMeet ? (
            <MeetTabsView
              activeTab={activeTab}
              onTabChange={setActiveTab}
              meetId={selectedMeet.id}
              meetName={selectedMeet.name}
              teamCode={selectedMeet.teamCode}
              onUpdateTeamCode={meetActions.updateTeamCode}
              importedEventsRaw={selectedMeet.importedEventsRaw}
              athletes={athletes}
              allAthletes={data.athletes}
              otherMeets={otherMeets}
              individualEntries={individualEntries}
              allIndividualEntries={data.individualEntries}
              relayEntries={relayEntries}
              allRelayEntries={data.relayEntries}
              onAddAthlete={athleteActions.addAthlete}
              onBulkAddAthletes={athleteActions.bulkAddAthletes}
              onImportAthletesCsv={athleteActions.importAthletesCsv}
              onImportAthletesFromMeet={athleteActions.importAthletesFromMeet}
              onUpdateAthlete={athleteActions.updateAthlete}
              onDeleteAthlete={athleteActions.deleteAthlete}
              onClearAllAthletes={athleteActions.clearAllAthletes}
              onReorderAthletes={athleteActions.reorderAthletes}
              individualEventOptions={individualEventOptions}
              relayEventOptions={relayEventOptions}
              importedEvents={importedEvents}
              athleteEventLimits={selectedMeet}
              onUpdateEventLimits={meetActions.updateEventLimits}
              eventEntryLimits={selectedMeet}
              onUpdateEventEntryLimits={meetActions.updateEventEntryLimits}
              onAddIndividualEntry={individualEntryActions.addIndividualEntry}
              onBulkAddIndividualEntries={individualEntryActions.bulkAddIndividualEntries}
              onImportIndividualEntriesCsv={individualEntryActions.importIndividualEntriesCsv}
              onImportIndividualEntriesFromMeet={
                individualEntryActions.importIndividualEntriesFromMeet
              }
              onUpdateIndividualEntry={individualEntryActions.updateIndividualEntry}
              onDeleteIndividualEntry={individualEntryActions.deleteIndividualEntry}
              onClearAllIndividualEntries={individualEntryActions.clearAllIndividualEntries}
              onReorderIndividualEntries={individualEntryActions.reorderIndividualEntries}
              onAddRelayEntry={relayEntryActions.addRelayEntry}
              onBulkAddRelayEntries={relayEntryActions.bulkAddRelayEntries}
              onImportRelayEntriesCsv={relayEntryActions.importRelayEntriesCsv}
              onImportRelayEntriesFromMeet={relayEntryActions.importRelayEntriesFromMeet}
              onUpdateRelayEntry={relayEntryActions.updateRelayEntry}
              onDeleteRelayEntry={relayEntryActions.deleteRelayEntry}
              onClearAllRelayEntries={relayEntryActions.clearAllRelayEntries}
              onReorderRelayEntries={relayEntryActions.reorderRelayEntries}
              eventsFileName={selectedMeet.importedEventsFileName}
              onImportEvents={hy3Export.importEvents}
              onImportEventsError={(message) => showInfo({ title: "Import Failed", message })}
              onClearImportedEvents={hy3Export.clearImportedEvents}
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
        onCreate={(name, templateId) => {
          if (templateId) {
            template.copyTemplateToMeet(templateId, name);
          } else {
            meetActions.addMeet(name);
          }
        }}
        templates={MEET_TEMPLATES}
      />
      <RenameMeetDialog
        key={renameMeetOpen ? selectedMeet?.id : "closed"}
        open={renameMeetOpen}
        initialName={selectedMeet?.name ?? ""}
        onClose={() => setRenameMeetOpen(false)}
        onRename={(name) => {
          if (selectedMeet) meetActions.renameMeet(selectedMeet.id, name);
          setRenameMeetOpen(false);
        }}
      />
      <ImportDuplicateMeetsDialog
        open={appDataBackup.duplicates.length > 0}
        duplicates={appDataBackup.duplicates}
        onChangeResolution={appDataBackup.setDuplicateResolution}
        onApply={appDataBackup.applyDuplicateResolutions}
        onCancel={appDataBackup.cancelDuplicateResolutions}
      />
      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ""}
        message={confirmDialog?.message ?? ""}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={() => confirmDialog?.onConfirm()}
        onClose={closeConfirm}
      />
      <InfoDialog
        open={infoDialog !== null}
        title={infoDialog?.title ?? ""}
        message={infoDialog?.message ?? ""}
        onClose={closeInfo}
      />
      <ExportReviewDialog
        review={hy3Export.exportReview}
        onClose={hy3Export.closeExportReview}
        onConfirm={hy3Export.confirmExport}
      />
    </Box>
  );
}

export default App;
