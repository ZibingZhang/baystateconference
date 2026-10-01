import { useState, type KeyboardEvent } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import type { MeetTemplate } from "../types";

interface AddMeetDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, templateId: string | null) => void;
  templates: MeetTemplate[];
}

const NO_TEMPLATE = "";

function AddMeetDialog({ open, onClose, onCreate, templates }: AddMeetDialogProps) {
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<string>(NO_TEMPLATE);

  const reset = () => {
    setName("");
    setTemplateId(NO_TEMPLATE);
  };

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, templateId || null);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleTemplateChange = (newTemplateId: string) => {
    setTemplateId(newTemplateId);
    if (!name.trim() && newTemplateId) {
      const template = templates.find((t) => t.id === newTemplateId);
      if (template) setName(template.name);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") handleCreate();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>New Meet</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Meet name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <TextField
          select
          fullWidth
          margin="dense"
          label="Template"
          value={templateId}
          onChange={(e) => handleTemplateChange(e.target.value)}
        >
          <MenuItem value={NO_TEMPLATE}>
            <em>None</em>
          </MenuItem>
          {templates.map((template) => (
            <MenuItem key={template.id} value={template.id}>
              {template.name}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleCreate} variant="contained" disabled={!name.trim()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddMeetDialog;
