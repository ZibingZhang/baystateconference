import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Checkbox from "@mui/material/Checkbox";
import type { ImportedEvent } from "../types";
import { uniqueEventOptions } from "../domain/ev3";
import { GENDER_AGE_NAMES } from "../hytek/enums";

interface BulkAddEntriesDialogProps {
  open: boolean;
  title: string;
  events: ImportedEvent[] | undefined;
  relay: boolean;
  onClose: () => void;
  onAdd: (count: number, eventNames: string[]) => void;
}

function BulkAddEntriesDialog({
  open,
  title,
  events,
  relay,
  onClose,
  onAdd,
}: BulkAddEntriesDialogProps) {
  const [count, setCount] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const options = useMemo(() => uniqueEventOptions(events ?? [], relay), [events, relay]);

  const genders = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const option of options) {
      if (seen.has(option.gender)) continue;
      seen.add(option.gender);
      list.push(option.gender);
    }
    return list;
  }, [options]);

  const parsed = Number.parseInt(count, 10);
  const isValid = Number.isFinite(parsed) && parsed > 0 && selected.size > 0;

  const handleClose = () => {
    setCount("");
    setSelected(new Set());
    onClose();
  };

  const handleSubmit = () => {
    if (!isValid) return;
    onAdd(parsed, Array.from(selected));
    handleClose();
  };

  const setGroupChecked = (names: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const name of names) {
        if (checked) next.add(name);
        else next.delete(name);
      }
      return next;
    });
  };

  const allNames = options.map((option) => option.name);
  const allChecked = allNames.length > 0 && allNames.every((name) => selected.has(name));
  const allIndeterminate = !allChecked && allNames.some((name) => selected.has(name));

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Entries per event"
          type="text"
          inputMode="numeric"
          fullWidth
          value={count}
          onChange={(event) => {
            const digitsOnly = event.target.value.replace(/\D/g, "");
            setCount(digitsOnly);
          }}
        />
        <Box sx={{ mt: 2, maxHeight: 320, overflowY: "auto" }}>
          <FormGroup>
            <FormControlLabel
              label="All Events"
              control={
                <Checkbox
                  checked={allChecked}
                  indeterminate={allIndeterminate}
                  onChange={(_, checked) => setGroupChecked(allNames, checked)}
                />
              }
            />
            {genders.map((gender) => {
              const genderNames = options
                .filter((option) => option.gender === gender)
                .map((option) => option.name);
              const checked = genderNames.length > 0 && genderNames.every((n) => selected.has(n));
              const indeterminate = !checked && genderNames.some((n) => selected.has(n));
              return (
                <FormControlLabel
                  key={gender}
                  sx={{ ml: 2 }}
                  label={`All ${GENDER_AGE_NAMES[gender as keyof typeof GENDER_AGE_NAMES] ?? gender} Events`}
                  control={
                    <Checkbox
                      checked={checked}
                      indeterminate={indeterminate}
                      onChange={(_, isChecked) => setGroupChecked(genderNames, isChecked)}
                    />
                  }
                />
              );
            })}
            <Divider sx={{ my: 1 }} />
            {options.map((option) => (
              <FormControlLabel
                key={option.name}
                sx={{ ml: 4 }}
                label={option.name}
                control={
                  <Checkbox
                    checked={selected.has(option.name)}
                    onChange={(_, checked) => setGroupChecked([option.name], checked)}
                  />
                }
              />
            ))}
          </FormGroup>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!isValid}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default BulkAddEntriesDialog;
