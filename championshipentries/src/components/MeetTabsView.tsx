import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import type {
  Athlete,
  AthleteEventLimits,
  EventEntryLimits,
  ImportedEvent,
  IndividualEntry,
  RelayEntry,
} from "../types";
import type { EventOption } from "../domain/ev3";
import {
  isAdvancedSubTab,
  topLevelTabFor,
  type MeetTab,
  type TopLevelMeetTab,
} from "../constants/meetTabs";
import AthletesGrid from "./AthletesGrid";
import IndividualEntriesGrid from "./IndividualEntriesGrid";
import RelayEntriesGrid from "./RelayEntriesGrid";
import EventsGrid from "./EventsGrid";
import TeamTab from "./TeamTab";
import EventSummaryTab from "./EventSummaryTab";
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
  allAthletes: Athlete[];
  otherMeets: { id: string; name: string }[];
  individualEntries: IndividualEntry[];
  relayEntries: RelayEntry[];
  onAddAthlete?: () => void;
  onBulkAddAthletes?: (count: number) => void;
  onImportAthletesCsv?: (
    rows: { firstName: string; lastName: string; gender: string; classYear: string }[],
  ) => void;
  onImportAthletesFromMeet?: (sourceMeetId: string, athleteIds: string[]) => void;
  onUpdateAthlete?: (athlete: Athlete) => void;
  onDeleteAthlete?: (id: string) => void;
  onClearAllAthletes?: () => void;
  onReorderAthletes?: (orderedIds: string[]) => void;

  individualEventOptions?: EventOption[];
  relayEventOptions?: EventOption[];
  importedEvents: ImportedEvent[] | undefined;
  athleteEventLimits?: Partial<AthleteEventLimits>;
  onUpdateEventLimits?: (limits: Partial<AthleteEventLimits>) => void;
  eventEntryLimits?: Partial<EventEntryLimits>;
  onUpdateEventEntryLimits?: (limits: Partial<EventEntryLimits>) => void;

  onAddIndividualEntry?: () => void;
  onBulkAddIndividualEntries?: (count: number, eventNumbers: number[]) => void;
  onImportIndividualEntriesCsv?: (
    rows: { event: string; athleteId: string; seedTime: string }[],
  ) => void;
  onUpdateIndividualEntry?: (entry: IndividualEntry) => void;
  onDeleteIndividualEntry?: (id: string) => void;
  onClearAllIndividualEntries?: () => void;
  onReorderIndividualEntries?: (orderedIds: string[]) => void;

  onAddRelayEntry?: () => void;
  onBulkAddRelayEntries?: (count: number, eventNumbers: number[]) => void;
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
  onReorderRelayEntries?: (orderedIds: string[]) => void;

  eventsFileName: string | undefined;
  onImportEvents?: (fileName: string, rawText: string) => void;
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
  allAthletes,
  otherMeets,
  individualEntries,
  relayEntries,
  onAddAthlete,
  onBulkAddAthletes,
  onImportAthletesCsv,
  onImportAthletesFromMeet,
  onUpdateAthlete,
  onDeleteAthlete,
  onClearAllAthletes,
  onReorderAthletes,
  individualEventOptions,
  relayEventOptions,
  importedEvents,
  athleteEventLimits,
  onUpdateEventLimits,
  eventEntryLimits,
  onUpdateEventEntryLimits,
  onAddIndividualEntry,
  onBulkAddIndividualEntries,
  onImportIndividualEntriesCsv,
  onUpdateIndividualEntry,
  onDeleteIndividualEntry,
  onClearAllIndividualEntries,
  onReorderIndividualEntries,
  onAddRelayEntry,
  onBulkAddRelayEntries,
  onImportRelayEntriesCsv,
  onUpdateRelayEntry,
  onDeleteRelayEntry,
  onClearAllRelayEntries,
  onReorderRelayEntries,
  eventsFileName,
  onImportEvents,
  onImportEventsError,
  onClearImportedEvents,
}: MeetTabsViewProps) {
  const topLevelTab = topLevelTabFor(activeTab);
  const handleTopLevelTabChange = (_: unknown, value: TopLevelMeetTab) => {
    if (value === "advanced") {
      if (!isAdvancedSubTab(activeTab)) {
        onTabChange("ev3");
      }
      return;
    }
    onTabChange(value);
  };

  return (
    <>
      <Tabs
        value={topLevelTab}
        onChange={handleTopLevelTabChange}
        sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}
      >
        <Tab label="Team" value="team" />
        <Tab label="Events" value="events" />
        <Tab label="Athletes" value="athletes" />
        <Tab label="Individual Entries" value="individual" />
        <Tab label="Relay Entries" value="relay" />
        <Tab label="By Event" value="summary" />
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
            meetId={meetId}
            athletes={athletes}
            allAthletes={allAthletes}
            otherMeets={otherMeets}
            individualEntries={individualEntries}
            relayEntries={relayEntries}
            onAdd={onAddAthlete ?? noop}
            onBulkAdd={onBulkAddAthletes ?? noop}
            onImportCsv={onImportAthletesCsv ?? noop}
            onImportFromMeet={onImportAthletesFromMeet ?? noop}
            onUpdate={onUpdateAthlete ?? noop}
            onDelete={onDeleteAthlete ?? noop}
            onClearAll={onClearAllAthletes ?? noop}
            onReorder={onReorderAthletes ?? noop}
            readOnly={readOnly}
            onReadOnlyAttempt={onReadOnlyAttempt}
          />
        )}
        {activeTab === "individual" && (
          <IndividualEntriesGrid
            meetId={meetId}
            entries={individualEntries}
            athletes={athletes}
            relayEntries={relayEntries}
            athleteEventLimits={athleteEventLimits}
            entryLimit={eventEntryLimits?.individualEventEntryLimit}
            eventOptions={individualEventOptions}
            importedEvents={importedEvents}
            onAdd={onAddIndividualEntry ?? noop}
            onBulkAdd={onBulkAddIndividualEntries ?? noop}
            onImportCsv={onImportIndividualEntriesCsv ?? noop}
            onUpdate={onUpdateIndividualEntry ?? noop}
            onDelete={onDeleteIndividualEntry ?? noop}
            onClearAll={onClearAllIndividualEntries ?? noop}
            onReorder={onReorderIndividualEntries ?? noop}
            readOnly={readOnly}
            onReadOnlyAttempt={onReadOnlyAttempt}
          />
        )}
        {activeTab === "relay" && (
          <RelayEntriesGrid
            meetId={meetId}
            entries={relayEntries}
            athletes={athletes}
            individualEntries={individualEntries}
            athleteEventLimits={athleteEventLimits}
            entryLimit={eventEntryLimits?.relayEventEntryLimit}
            eventOptions={relayEventOptions}
            importedEvents={importedEvents}
            onAdd={onAddRelayEntry ?? noop}
            onBulkAdd={onBulkAddRelayEntries ?? noop}
            onImportCsv={onImportRelayEntriesCsv ?? noop}
            onUpdate={onUpdateRelayEntry ?? noop}
            onDelete={onDeleteRelayEntry ?? noop}
            onClearAll={onClearAllRelayEntries ?? noop}
            onReorder={onReorderRelayEntries ?? noop}
            readOnly={readOnly}
            onReadOnlyAttempt={onReadOnlyAttempt}
          />
        )}
        {activeTab === "summary" && (
          <EventSummaryTab
            importedEvents={importedEvents}
            athletes={athletes}
            individualEntries={individualEntries}
            relayEntries={relayEntries}
            athleteEventLimits={athleteEventLimits}
            eventEntryLimits={eventEntryLimits}
          />
        )}
        {isAdvancedSubTab(activeTab) && (
          <AdvancedTab
            subTab={activeTab}
            onSubTabChange={onTabChange}
            meet={{ id: meetId, name: meetName, teamCode, importedEventsRaw }}
            athletes={athletes}
            individualEntries={individualEntries}
            relayEntries={relayEntries}
            athleteEventLimits={athleteEventLimits}
            onUpdateEventLimits={onUpdateEventLimits}
            eventEntryLimits={eventEntryLimits}
            onUpdateEventEntryLimits={onUpdateEventEntryLimits}
            readOnly={readOnly}
            onReadOnlyAttempt={onReadOnlyAttempt}
          />
        )}
        {activeTab === "events" && (
          <EventsGrid
            fileName={eventsFileName}
            events={importedEvents}
            importedEventsRaw={importedEventsRaw}
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
