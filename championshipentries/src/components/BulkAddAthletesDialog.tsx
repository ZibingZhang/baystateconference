import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

interface BulkAddAthletesDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (count: number) => void;
}

function BulkAddAthletesDialog({ open, onClose, onAdd }: BulkAddAthletesDialogProps) {
  const [count, setCount] = useState("");

  const parsed = Number.parseInt(count, 10);
  const isValid = Number.isFinite(parsed) && parsed > 0;

  const handleClose = () => {
    setCount("");
    onClose();
  };

  const handleSubmit = () => {
    if (!isValid) return;
    onAdd(parsed);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Bulk Add Athletes</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Number of athletes"
          type="text"
          inputMode="numeric"
          fullWidth
          value={count}
          onChange={(event) => {
            const digitsOnly = event.target.value.replace(/\D/g, "");
            setCount(digitsOnly);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSubmit();
          }}
        />
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

export default BulkAddAthletesDialog;
