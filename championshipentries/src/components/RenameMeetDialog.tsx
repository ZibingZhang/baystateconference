import { useState, type KeyboardEvent, type FocusEvent } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

interface RenameMeetDialogProps {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onRename: (name: string) => void;
}

function RenameMeetDialog({ open, initialName, onClose, onRename }: RenameMeetDialogProps) {
  const [name, setName] = useState(initialName);

  const handleRename = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onRename(trimmed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") handleRename();
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => event.target.select();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Rename Meet</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Meet name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleRename} variant="contained" disabled={!name.trim()}>
          Rename
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RenameMeetDialog;
