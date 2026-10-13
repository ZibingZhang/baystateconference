import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

interface PrintPsychSheetDialogProps {
  open: boolean;
  onClose: () => void;
  onPrint: (hideEmptyEvents: boolean) => void;
}

function PrintPsychSheetDialog({ open, onClose, onPrint }: PrintPsychSheetDialogProps) {
  const [hideEmptyEvents, setHideEmptyEvents] = useState(false);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Print Psych Sheet</DialogTitle>
      <DialogContent>
        <FormControlLabel
          label="Hide events with no entries"
          control={
            <Checkbox
              checked={hideEmptyEvents}
              onChange={(_, checked) => setHideEmptyEvents(checked)}
            />
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            onPrint(hideEmptyEvents);
            onClose();
          }}
        >
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PrintPsychSheetDialog;
