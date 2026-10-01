import { useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { downloadTextFile } from "../utils/csv";

type Destination = "download" | "copy";

interface Ev3ExportDialogProps {
  open: boolean;
  fileName: string;
  content: string;
  onClose: () => void;
}

function Ev3ExportDialog({ open, fileName, content, onClose }: Ev3ExportDialogProps) {
  const [destination, setDestination] = useState<Destination>("download");
  const [copied, setCopied] = useState(false);
  const textFieldRef = useRef<HTMLTextAreaElement>(null);

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  const handleDownload = () => {
    downloadTextFile(fileName, content, "application/octet-stream");
    handleClose();
  };

  const handleCopy = () => {
    navigator.clipboard
      .writeText(content)
      .then(() => setCopied(true))
      .catch(() => {
        textFieldRef.current?.select();
      });
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Export EV3 File</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={destination}
            onChange={(_event, value: Destination | null) => {
              if (value) {
                setDestination(value);
                setCopied(false);
              }
            }}
          >
            <ToggleButton value="download">Download File</ToggleButton>
            <ToggleButton value="copy">Copy Text</ToggleButton>
          </ToggleButtonGroup>
          {destination === "copy" && (
            <TextField
              multiline
              minRows={8}
              maxRows={16}
              value={content}
              inputRef={textFieldRef}
              onFocus={(event) => event.target.select()}
              slotProps={{
                htmlInput: { readOnly: true, style: { fontFamily: "monospace" } },
              }}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {destination === "download" ? (
          <Button onClick={handleDownload}>Export</Button>
        ) : (
          <Button onClick={handleCopy}>{copied ? "Copied!" : "Copy to Clipboard"}</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default Ev3ExportDialog;
