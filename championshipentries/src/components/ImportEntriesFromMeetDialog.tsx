import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import type { Athlete } from "../types";
import { parseEv3 } from "../domain/ev3";
import { buildAthleteNameById } from "../utils/entryGridShared";

/** Context passed to `describeEntry` so it can render athlete/event names for the currently selected source meet. */
export interface EntryLabelContext {
  athleteNameById: Map<string, string>;
  eventNameByNumber: Map<number, string>;
}

interface ImportEntriesFromMeetDialogProps<T extends { id: string; meetId: string }> {
  open: boolean;
  onClose: () => void;
  title: string;
  selectAllLabel: string;
  noEntriesLabel: string;
  meets: { id: string; name: string; importedEventsRaw?: string }[];
  athletes: Athlete[];
  entries: T[];
  describeEntry: (entry: T, ctx: EntryLabelContext) => string;
  onImport: (sourceMeetId: string, entryIds: string[]) => void;
}

/** `ImportAthletesFromMeetDialog`'s layout, generalized for individual/relay entries, whose labels depend on the selected source meet's own events and athletes. */
function ImportEntriesFromMeetDialog<T extends { id: string; meetId: string }>({
  open,
  onClose,
  title,
  selectAllLabel,
  noEntriesLabel,
  meets,
  athletes,
  entries,
  describeEntry,
  onImport,
}: ImportEntriesFromMeetDialogProps<T>) {
  const [sourceMeetId, setSourceMeetId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sourceMeet = meets.find((m) => m.id === sourceMeetId);
  const labelContext = useMemo<EntryLabelContext>(() => {
    const events = sourceMeet?.importedEventsRaw
      ? parseEv3(sourceMeet.importedEventsRaw).events
      : [];
    return {
      athleteNameById: buildAthleteNameById(athletes),
      eventNameByNumber: new Map(events.map((e) => [e.eventNumber, e.displayName])),
    };
  }, [sourceMeet, athletes]);

  const sourceEntries = useMemo(() => {
    return entries
      .filter((e) => e.meetId === sourceMeetId)
      .map((entry) => ({ entry, label: describeEntry(entry, labelContext) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [entries, sourceMeetId, describeEntry, labelContext]);

  const reset = () => {
    setSourceMeetId("");
    setSelected(new Set());
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleMeetChange = (id: string) => {
    setSourceMeetId(id);
    setSelected(new Set());
  };

  const handleSubmit = () => {
    if (!sourceMeetId || selected.size === 0) return;
    onImport(sourceMeetId, Array.from(selected));
    reset();
    onClose();
  };

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const allChecked =
    sourceEntries.length > 0 && sourceEntries.every(({ entry }) => selected.has(entry.id));
  const allIndeterminate = !allChecked && sourceEntries.some(({ entry }) => selected.has(entry.id));

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          select
          fullWidth
          margin="dense"
          label="Source meet"
          value={sourceMeetId}
          onChange={(e) => handleMeetChange(e.target.value)}
        >
          {meets.map((meet) => (
            <MenuItem key={meet.id} value={meet.id}>
              {meet.name}
            </MenuItem>
          ))}
        </TextField>
        {sourceMeetId &&
          (sourceEntries.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              {noEntriesLabel}
            </Typography>
          ) : (
            <Box sx={{ mt: 2, maxHeight: 320, overflowY: "auto" }}>
              <FormGroup>
                <FormControlLabel
                  label={selectAllLabel}
                  control={
                    <Checkbox
                      checked={allChecked}
                      indeterminate={allIndeterminate}
                      onChange={(_, checked) =>
                        setSelected(
                          checked ? new Set(sourceEntries.map(({ entry }) => entry.id)) : new Set(),
                        )
                      }
                    />
                  }
                />
                <Divider sx={{ my: 1 }} />
                {sourceEntries.map(({ entry, label }) => (
                  <FormControlLabel
                    key={entry.id}
                    sx={{ ml: 2 }}
                    label={label}
                    control={
                      <Checkbox
                        checked={selected.has(entry.id)}
                        onChange={(_, checked) => toggle(entry.id, checked)}
                      />
                    }
                  />
                ))}
              </FormGroup>
            </Box>
          ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!sourceMeetId || selected.size === 0}>
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ImportEntriesFromMeetDialog;
