import type { ChangeEvent } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { AthleteEventLimits, EventEntryLimits } from "../types";

interface SettingsTabProps {
  athleteEventLimits?: Partial<AthleteEventLimits>;
  onUpdate?: (limits: Partial<AthleteEventLimits>) => void;
  eventEntryLimits?: Partial<EventEntryLimits>;
  onUpdateEventEntryLimits?: (limits: Partial<EventEntryLimits>) => void;
  readOnly?: boolean;
  onReadOnlyAttempt?: () => void;
}

function fieldValue(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function SettingsTab({
  athleteEventLimits,
  onUpdate,
  eventEntryLimits,
  onUpdateEventEntryLimits,
  readOnly,
  onReadOnlyAttempt,
}: SettingsTabProps) {
  const handleChange =
    (key: keyof AthleteEventLimits) => (event: ChangeEvent<HTMLInputElement>) => {
      if (readOnly) {
        onReadOnlyAttempt?.();
        return;
      }
      const digitsOnly = event.target.value.replace(/\D/g, "");
      onUpdate?.({ [key]: digitsOnly === "" ? undefined : Number(digitsOnly) });
    };

  const handleEventEntryLimitChange =
    (key: keyof EventEntryLimits) => (event: ChangeEvent<HTMLInputElement>) => {
      if (readOnly) {
        onReadOnlyAttempt?.();
        return;
      }
      const digitsOnly = event.target.value.replace(/\D/g, "");
      onUpdateEventEntryLimits?.({ [key]: digitsOnly === "" ? undefined : Number(digitsOnly) });
    };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 320 }}>
      <Typography variant="subtitle2">Per-Athlete Event Limits</Typography>
      <TextField
        label="Max individual events"
        type="text"
        inputMode="numeric"
        fullWidth
        value={fieldValue(athleteEventLimits?.maxIndividualEventsPerAthlete)}
        onChange={handleChange("maxIndividualEventsPerAthlete")}
      />
      <TextField
        label="Max relay events"
        type="text"
        inputMode="numeric"
        fullWidth
        value={fieldValue(athleteEventLimits?.maxRelayEventsPerAthlete)}
        onChange={handleChange("maxRelayEventsPerAthlete")}
      />
      <TextField
        label="Max total events"
        type="text"
        inputMode="numeric"
        fullWidth
        value={fieldValue(athleteEventLimits?.maxTotalEventsPerAthlete)}
        onChange={handleChange("maxTotalEventsPerAthlete")}
      />
      <Typography variant="subtitle2">Per-Event Entry Limits</Typography>
      <TextField
        label="Max entries per individual event"
        type="text"
        inputMode="numeric"
        fullWidth
        value={fieldValue(eventEntryLimits?.individualEventEntryLimit)}
        onChange={handleEventEntryLimitChange("individualEventEntryLimit")}
      />
      <TextField
        label="Max entries per relay event"
        type="text"
        inputMode="numeric"
        fullWidth
        value={fieldValue(eventEntryLimits?.relayEventEntryLimit)}
        onChange={handleEventEntryLimitChange("relayEventEntryLimit")}
      />
    </Box>
  );
}

export default SettingsTab;
