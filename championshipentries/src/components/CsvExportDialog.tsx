import { useMemo, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import RadioGroup from "@mui/material/RadioGroup";
import Radio from "@mui/material/Radio";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { stringifyDelimited, downloadTextFile } from "../utils/csv";

type Separator = "," | "\t";
type Destination = "download" | "copy";

interface CsvExportDialogProps {
  open: boolean;
  title: string;
  fileNamePrefix: string;
  headers: string[];
  rows: string[][];
  onClose: () => void;
}

function CsvExportDialog({
  open,
  title,
  fileNamePrefix,
  headers,
  rows,
  onClose,
}: CsvExportDialogProps) {
  const [separator, setSeparator] = useState<Separator>(",");
  const [destination, setDestination] = useState<Destination>("download");
  const [copied, setCopied] = useState(false);
  const textFieldRef = useRef<HTMLTextAreaElement>(null);

  const content = useMemo(
    () => stringifyDelimited([headers, ...rows], separator),
    [headers, rows, separator],
  );

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  const handleDownload = () => {
    const extension = separator === "\t" ? "tsv" : "csv";
    const mimeType = separator === "\t" ? "text/tab-separated-values" : "text/csv";
    downloadTextFile(`${fileNamePrefix}.${extension}`, content, mimeType);
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
      <DialogTitle>{title}</DialogTitle>
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
          <FormControl>
            <FormLabel sx={{ mb: 1 }}>Separator</FormLabel>
            <RadioGroup
              row
              value={separator}
              onChange={(event) => setSeparator(event.target.value as Separator)}
            >
              <FormControlLabel value="," control={<Radio />} label="Comma" />
              <FormControlLabel value={"\t"} control={<Radio />} label="Tab" />
            </RadioGroup>
          </FormControl>
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

export default CsvExportDialog;
