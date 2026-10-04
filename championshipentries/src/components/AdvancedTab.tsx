import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import type {
  Athlete,
  AthleteEventLimits,
  EventEntryLimits,
  IndividualEntry,
  Meet,
  RelayEntry,
} from "../types";
import type { AdvancedSubTab } from "../constants/meetTabs";
import Ev3Tab from "./Ev3Tab";
import Hy3Tab from "./Hy3Tab";
import SettingsTab from "./SettingsTab";

interface AdvancedTabProps {
  subTab: AdvancedSubTab;
  onSubTabChange: (tab: AdvancedSubTab) => void;
  meet: Meet;
  athletes: Athlete[];
  individualEntries: IndividualEntry[];
  relayEntries: RelayEntry[];
  athleteEventLimits?: Partial<AthleteEventLimits>;
  onUpdateEventLimits?: (limits: Partial<AthleteEventLimits>) => void;
  eventEntryLimits?: Partial<EventEntryLimits>;
  onUpdateEventEntryLimits?: (limits: Partial<EventEntryLimits>) => void;
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;
}

function AdvancedTab({
  subTab,
  onSubTabChange,
  meet,
  athletes,
  individualEntries,
  relayEntries,
  athleteEventLimits,
  onUpdateEventLimits,
  eventEntryLimits,
  onUpdateEventEntryLimits,
  readOnly,
  onReadOnlyAttempt,
}: AdvancedTabProps) {
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Tabs
        value={subTab}
        onChange={(_, value: AdvancedSubTab) => onSubTabChange(value)}
        sx={{ borderBottom: 1, borderColor: "divider", minHeight: 36, mb: 1 }}
      >
        <Tab label="EV3 File" value="ev3" sx={{ minHeight: 36 }} />
        <Tab label="HY3 Preview" value="hy3" sx={{ minHeight: 36 }} />
        <Tab label="Settings" value="settings" sx={{ minHeight: 36 }} />
      </Tabs>
      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* EV3/HY3 stay mounted while switching sub-tabs so the HY3 preview
            isn't rebuilt every time you flip to Settings and back. */}
        <Box sx={{ display: subTab === "ev3" ? "flex" : "none", flex: 1, minHeight: 0 }}>
          <Ev3Tab importedEventsRaw={meet.importedEventsRaw} />
        </Box>
        <Box sx={{ display: subTab === "hy3" ? "flex" : "none", flex: 1, minHeight: 0 }}>
          <Hy3Tab
            meet={meet}
            athletes={athletes}
            individualEntries={individualEntries}
            relayEntries={relayEntries}
          />
        </Box>
        {subTab === "settings" && (
          <Box sx={{ p: 1 }}>
            <SettingsTab
              athleteEventLimits={athleteEventLimits}
              onUpdate={onUpdateEventLimits}
              eventEntryLimits={eventEntryLimits}
              onUpdateEventEntryLimits={onUpdateEventEntryLimits}
              readOnly={readOnly}
              onReadOnlyAttempt={onReadOnlyAttempt}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default AdvancedTab;
