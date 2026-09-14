import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import type { Athlete, ImportedEvent, IndividualEntry, RelayEntry } from "../types";
import type { MeetTab } from "../constants/meetTabs";
import AthletesGrid from "./AthletesGrid";
import IndividualEntriesGrid from "./IndividualEntriesGrid";
import RelayEntriesGrid from "./RelayEntriesGrid";
import EventsGrid from "./EventsGrid";
import TeamTab from "./TeamTab";
import AdvancedTab from "./AdvancedTab";

const noop = () => {};

interface MeetTabsViewProps {
  activeTab: MeetTab;
  onTabChange: (tab: MeetTab) => void;
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;

  meetId: string;
  meetName: string;
  teamCode: string | undefined;
  onUpdateTeamCode?: (teamCode: string) => void;
  importedEventsRaw: string | undefined;

  athletes: Athlete[];
  individualEntries: IndividualEntry[];
  relayEntries: RelayEntry[];
  onAddAthlete?: () => void;
  onBulkAddAthletes?: (count: number) => void;
  onImportAthletesCsv?: (
    rows: { firstName: string; lastName: string; gender: string; classYear: string }[],
  ) => void;
  onUpdateAthlete?: (athlete: Athlete) => void;
  onDeleteAthlete?: (id: string) => void;
  onClearAllAthletes?: () => void;

  individualEventOptions?: string[];
  relayEventOptions?: string[];
  importedEvents: ImportedEvent[] | undefined;

  onAddIndividualEntry?: () => void;
  onBulkAddIndividualEntries?: (count: number, eventNames: string[]) => void;
  onImportIndividualEntriesCsv?: (
    rows: { event: string; athleteId: string; seedTime: string }[],
  ) => void;
  onUpdateIndividualEntry?: (entry: IndividualEntry) => void;
  onDeleteIndividualEntry?: (id: string) => void;
  onClearAllIndividualEntries?: () => void;

  onAddRelayEntry?: () => void;
  onBulkAddRelayEntries?: (count: number, eventNames: string[]) => void;
  onImportRelayEntriesCsv?: (
    rows: {
      event: string;
      relayLetter: string;
      leg1AthleteId: string;
      leg2AthleteId: string;
      leg3AthleteId: string;
      leg4AthleteId: string;
      seedTime: string;
    }[],
  ) => void;
  onUpdateRelayEntry?: (entry: RelayEntry) => void;
  onDeleteRelayEntry?: (id: string) => void;
  onClearAllRelayEntries?: () => void;

  eventsFileName: string | undefined;
  onImportEvents?: (fileName: string, events: ImportedEvent[], rawText: string) => void;
  onImportEventsError?: (message: string) => void;
  onClearImportedEvents?: () => void;
}

function MeetTabsView({
  activeTab,
  onTabChange,
  readOnly,
  onReadOnlyAttempt,
  meetId,
  meetName,
  teamCode,
  onUpdateTeamCode,
  importedEventsRaw,
  athletes,
  individualEntries,
  relayEntries,
  onAddAthlete,
  onBulkAddAthletes,
  onImportAthletesCsv,
  onUpdateAthlete,
  onDeleteAthlete,
  onClearAllAthletes,
  individualEventOptions,
  relayEventOptions,
  importedEvents,
  onAddIndividualEntry,
  onBulkAddIndividualEntries,
  onImportIndividualEntriesCsv,
  onUpdateIndividualEntry,
  onDeleteIndividualEntry,
  onClearAllIndividualEntries,
  onAddRelayEntry,
  onBulkAddRelayEntries,
  onImportRelayEntriesCsv,
  onUpdateRelayEntry,
  onDeleteRelayEntry,
  onClearAllRelayEntries,
  eventsFileName,
  onImportEvents,
  onImportEventsError,
  onClearImportedEvents,
}: MeetTabsViewProps) {
  return (
    <>
      <Tabs
        value={activeTab}
        onChange={(_, value: MeetTab) => onTabChange(value)}
        sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}
      >
        <Tab label="Team" value="team" />
        <Tab label="Events" value="events" />
        <Tab label="Athletes" value="athletes" />
        <Tab label="Individual Entries" value="individual" />
        <Tab label="Relay Entries" value="relay" />
        <Tab label="Advanced" value="advanced" />
      </Tabs>
      <Box sx={{ flex: 1, minHeight: 0, p: 2 }}>
        {activeTab === "team" && (
          <TeamTab
            teamCode={teamCode}
            onUpdate={onUpdateTeamCode ?? noop}
            readOnly={readOnly}
            onReadOnlyAttempt={onReadOnlyAttempt}
          />
        )}
        {activeTab === "athletes" && (
          <AthletesGrid
            athletes={athletes}
            individualEntries={individualEntries}
            relayEntries={relayEntries}
            onAdd={onAddAthlete ?? noop}
            onBulkAdd={onBulkAddAthletes ?? noop}
            onImportCsv={onImportAthletesCsv ?? noop}
            onUpdate={onUpdateAthlete ?? noop}
            onDelete={onDeleteAthlete ?? noop}
            onClearAll={onClearAllAthletes ?? noop}
            readOnly={readOnly}
            onReadOnlyAttempt={onReadOnlyAttempt}
          />
        )}
        {activeTab === "individual" && (
          <IndividualEntriesGrid
            entries={individualEntries}
            athletes={athletes}
            eventOptions={individualEventOptions}
            importedEvents={importedEvents}
            onAdd={onAddIndividualEntry ?? noop}
            onBulkAdd={onBulkAddIndividualEntries ?? noop}
            onImportCsv={onImportIndividualEntriesCsv ?? noop}
            onUpdate={onUpdateIndividualEntry ?? noop}
            onDelete={onDeleteIndividualEntry ?? noop}
            onClearAll={onClearAllIndividualEntries ?? noop}
            readOnly={readOnly}
            onReadOnlyAttempt={onReadOnlyAttempt}
          />
        )}
        {activeTab === "relay" && (
          <RelayEntriesGrid
            entries={relayEntries}
            athletes={athletes}
            eventOptions={relayEventOptions}
            importedEvents={importedEvents}
            onAdd={onAddRelayEntry ?? noop}
            onBulkAdd={onBulkAddRelayEntries ?? noop}
            onImportCsv={onImportRelayEntriesCsv ?? noop}
            onUpdate={onUpdateRelayEntry ?? noop}
            onDelete={onDeleteRelayEntry ?? noop}
            onClearAll={onClearAllRelayEntries ?? noop}
            readOnly={readOnly}
            onReadOnlyAttempt={onReadOnlyAttempt}
          />
        )}
        {activeTab === "advanced" && (
          <AdvancedTab
            meet={{ id: meetId, name: meetName, teamCode, importedEventsRaw }}
            athletes={athletes}
            individualEntries={individualEntries}
            relayEntries={relayEntries}
          />
        )}
        {activeTab === "events" && (
          <EventsGrid
            fileName={eventsFileName}
            events={importedEvents}
            onImport={onImportEvents ?? noop}
            onImportError={onImportEventsError ?? noop}
            onClear={onClearImportedEvents ?? noop}
            readOnly={readOnly}
            onReadOnlyAttempt={onReadOnlyAttempt}
          />
        )}
      </Box>
    </>
  );
}

export default MeetTabsView;
