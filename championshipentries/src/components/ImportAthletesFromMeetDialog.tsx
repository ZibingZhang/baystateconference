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

interface ImportAthletesFromMeetDialogProps {
  open: boolean;
  onClose: () => void;
  meets: { id: string; name: string }[];
  athletes: Athlete[];
  onImport: (sourceMeetId: string, athleteIds: string[]) => void;
}

function ImportAthletesFromMeetDialog({
  open,
  onClose,
  meets,
  athletes,
  onImport,
}: ImportAthletesFromMeetDialogProps) {
  const [sourceMeetId, setSourceMeetId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sourceAthletes = useMemo(
    () =>
      athletes
        .filter((a) => a.meetId === sourceMeetId)
        .sort(
          (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
        ),
    [athletes, sourceMeetId],
  );

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

  const allChecked = sourceAthletes.length > 0 && sourceAthletes.every((a) => selected.has(a.id));
  const allIndeterminate = !allChecked && sourceAthletes.some((a) => selected.has(a.id));

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Import Athletes from Another Meet</DialogTitle>
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
          (sourceAthletes.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              This meet has no athletes.
            </Typography>
          ) : (
            <Box sx={{ mt: 2, maxHeight: 320, overflowY: "auto" }}>
              <FormGroup>
                <FormControlLabel
                  label="All Athletes"
                  control={
                    <Checkbox
                      checked={allChecked}
                      indeterminate={allIndeterminate}
                      onChange={(_, checked) =>
                        setSelected(checked ? new Set(sourceAthletes.map((a) => a.id)) : new Set())
                      }
                    />
                  }
                />
                <Divider sx={{ my: 1 }} />
                {sourceAthletes.map((athlete) => (
                  <FormControlLabel
                    key={athlete.id}
                    sx={{ ml: 2 }}
                    label={`${athlete.lastName}, ${athlete.firstName}`}
                    control={
                      <Checkbox
                        checked={selected.has(athlete.id)}
                        onChange={(_, checked) => toggle(athlete.id, checked)}
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

export default ImportAthletesFromMeetDialog;
