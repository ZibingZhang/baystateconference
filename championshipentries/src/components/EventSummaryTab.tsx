import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type {
  Athlete,
  AthleteEventLimits,
  EventEntryLimits,
  ImportedEvent,
  IndividualEntry,
  RelayEntry,
} from "../types";
import { buildEventSummary } from "../domain/eventSummary";
import { warningTooltip } from "../utils/entryGridShared";

interface EventSummaryTabProps {
  importedEvents: ImportedEvent[] | undefined;
  athletes: Athlete[];
  individualEntries: IndividualEntry[];
  relayEntries: RelayEntry[];
  athleteEventLimits?: Partial<AthleteEventLimits>;
  eventEntryLimits?: Partial<EventEntryLimits>;
}

function EventSummaryTab({
  importedEvents,
  athletes,
  individualEntries,
  relayEntries,
  athleteEventLimits,
  eventEntryLimits,
}: EventSummaryTabProps) {
  const groups = useMemo(
    () =>
      buildEventSummary(
        importedEvents ?? [],
        athletes,
        individualEntries,
        relayEntries,
        athleteEventLimits,
        eventEntryLimits,
      ),
    [
      importedEvents,
      athletes,
      individualEntries,
      relayEntries,
      athleteEventLimits,
      eventEntryLimits,
    ],
  );

  if (!importedEvents || importedEvents.length === 0) {
    return (
      <Typography color="text.secondary">
        Import an EV3 events file on the Events tab to see entries grouped by event.
      </Typography>
    );
  }

  return (
    <Box
      sx={{ height: "100%", overflow: "auto", display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      {groups.map((group) => (
        <Box
          key={`${group.relay ? "relay" : "individual"}-${group.displayName}`}
          sx={{
            border: 1,
            borderColor: group.overLimit ? "error.main" : "divider",
            borderRadius: 1,
            p: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: 40 }}>
              #{group.eventNumber}
            </Typography>
            <Typography variant="subtitle2" sx={{ flex: 1 }}>
              {group.displayName}
            </Typography>
            <Tooltip
              title={
                group.overLimit
                  ? `${group.entries.length} entries exceeds the limit of ${group.entryLimit} for this event`
                  : ""
              }
              disableHoverListener={!group.overLimit}
            >
              <Chip
                label={
                  group.entryLimit > 0
                    ? `${group.entries.length} / ${group.entryLimit}`
                    : group.entries.length
                }
                size="small"
                color={
                  group.overLimit ? "error" : group.entries.length === 0 ? "default" : "primary"
                }
                variant={group.entries.length === 0 ? "outlined" : "filled"}
              />
            </Tooltip>
          </Box>
          {group.entries.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, pl: 5 }}>
              No entries yet.
            </Typography>
          ) : (
            <Box
              component="ul"
              sx={{ m: 0, mt: 0.75, pl: 5, display: "flex", flexDirection: "column", gap: 0.25 }}
            >
              {group.entries.map((entry) => (
                <Box
                  component="li"
                  key={entry.key}
                  sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                >
                  <Typography variant="body2" component="span">
                    {entry.label}
                    {entry.detail ? ` — ${entry.detail}` : ""}
                    {entry.seedTime ? ` (${entry.seedTime})` : ""}
                  </Typography>
                  {entry.warnings.length > 0 && (
                    <Tooltip title={warningTooltip(entry.warnings)}>
                      <WarningAmberIcon fontSize="small" sx={{ color: "error.main" }} />
                    </Tooltip>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

export default EventSummaryTab;
