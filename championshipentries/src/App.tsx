import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { useAppData } from "./storage";
import { useHistory } from "./hooks/useHistory";
import type { Athlete, IndividualEntry, RelayEntry } from "./types";
import { uniqueEventNames } from "./domain/ev3";
import { MEET_TEMPLATES, templateFileName } from "./domain/meetTemplates";
import AppMenuBar from "./components/AppMenuBar";
import MeetSidebar from "./components/MeetSidebar";
import AddMeetDialog from "./components/AddMeetDialog";
import AboutDialog from "./components/AboutDialog";
import HowToPage from "./components/HowToPage";
import ConfirmDialog from "./components/ConfirmDialog";
import InfoDialog from "./components/InfoDialog";
import MeetTabsView from "./components/MeetTabsView";
import { useMeetCrud } from "./hooks/useMeetCrud";
import { useDialogState } from "./hooks/useDialogState";
import { useMeetUrlState } from "./hooks/useMeetUrlState";
import { useTemplatePreview, TEMPLATE_READ_ONLY_MESSAGE } from "./hooks/useTemplatePreview";
import { useMeetActions } from "./hooks/useMeetActions";
import { useAthleteActions } from "./hooks/useAthleteActions";
import { useIndividualEntryActions } from "./hooks/useIndividualEntryActions";
import { useRelayEntryActions } from "./hooks/useRelayEntryActions";
import { useHy3Export } from "./hooks/useHy3Export";

function App() {
  const [data, setData] = useAppData();
  const history = useHistory(data, setData);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [addMeetOpen, setAddMeetOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

  const { confirmDialog, showConfirm, closeConfirm, infoDialog, showInfo, closeInfo } =
    useDialogState();
  const { selectedMeetId, setSelectedMeetId, activeTab, setActiveTab, clearTab } =
    useMeetUrlState(howToOpen);

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

  const template = useTemplatePreview(history, { setSelectedMeetId, setHowToOpen, showInfo });
  const meetActions = useMeetActions(data, history, selectedMeetId, {
    setSelectedMeetId,
    setHowToOpen,
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
    { showConfirm },
  );
  const relayEntryActions = useRelayEntryActions(relayEntryCrud, data, selectedMeetId, {
    showConfirm,
  });
  const hy3Export = useHy3Export(data, history, selectedMeetId, { showInfo, showConfirm });
  const { selectedTemplateId, selectedTemplate, templateData } = template;

  if (!howToOpen && !selectedTemplateId && !data.meets.some((m) => m.id === selectedMeetId)) {
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
        onExportHy3={hy3Export.exportHy3}
        exportDisabled={!selectedMeet}
        onHowTo={() => {
          setSelectedMeetId(null);
          template.clearTemplate();
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
            template.clearTemplate();
            setHowToOpen(false);
          }}
          onAddMeet={() => setAddMeetOpen(true)}
          onDeleteMeet={meetActions.deleteMeet}
          onCopyMeet={meetActions.copyMeet}
          onRenameMeet={meetActions.renameMeet}
          templates={MEET_TEMPLATES}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={template.selectTemplate}
          onCopyTemplate={template.copyTemplateToMeet}
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
                  onReadOnlyAttempt={template.handleReadOnlyAttempt}
                  meetId={selectedTemplate.id}
                  meetName={selectedTemplate.name}
                  teamCode={undefined}
                  importedEventsRaw={undefined}
                  athletes={[]}
                  individualEntries={template.templateIndividualEntries}
                  relayEntries={template.templateRelayEntries}
                  individualEventOptions={template.templateIndividualEventOptions}
                  relayEventOptions={template.templateRelayEventOptions}
                  importedEvents={templateData.events}
                  eventsFileName={templateFileName(selectedTemplate.ev3Url)}
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
              individualEntries={individualEntries}
              relayEntries={relayEntries}
              onAddAthlete={athleteActions.addAthlete}
              onBulkAddAthletes={athleteActions.bulkAddAthletes}
              onImportAthletesCsv={athleteActions.importAthletesCsv}
              onUpdateAthlete={athleteActions.updateAthlete}
              onDeleteAthlete={athleteActions.deleteAthlete}
              onClearAllAthletes={athleteActions.clearAllAthletes}
              individualEventOptions={individualEventOptions}
              relayEventOptions={relayEventOptions}
              importedEvents={selectedMeet.importedEvents}
              onAddIndividualEntry={individualEntryActions.addIndividualEntry}
              onBulkAddIndividualEntries={individualEntryActions.bulkAddIndividualEntries}
              onImportIndividualEntriesCsv={individualEntryActions.importIndividualEntriesCsv}
              onUpdateIndividualEntry={individualEntryActions.updateIndividualEntry}
              onDeleteIndividualEntry={individualEntryActions.deleteIndividualEntry}
              onClearAllIndividualEntries={individualEntryActions.clearAllIndividualEntries}
              onAddRelayEntry={relayEntryActions.addRelayEntry}
              onBulkAddRelayEntries={relayEntryActions.bulkAddRelayEntries}
              onImportRelayEntriesCsv={relayEntryActions.importRelayEntriesCsv}
              onUpdateRelayEntry={relayEntryActions.updateRelayEntry}
              onDeleteRelayEntry={relayEntryActions.deleteRelayEntry}
              onClearAllRelayEntries={relayEntryActions.clearAllRelayEntries}
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
        onCreate={meetActions.addMeet}
      />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
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
    </Box>
  );
}

export default App;
