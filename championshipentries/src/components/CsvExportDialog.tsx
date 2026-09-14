import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import RadioGroup from "@mui/material/RadioGroup";
import Radio from "@mui/material/Radio";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import { stringifyDelimited, downloadTextFile } from "../utils/csv";

type Separator = "," | "\t";

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

  const handleExport = () => {
    const content = stringifyDelimited([headers, ...rows], separator);
    const extension = separator === "\t" ? "tsv" : "csv";
    const mimeType = separator === "\t" ? "text/tab-separated-values" : "text/csv";
    downloadTextFile(`${fileNamePrefix}.${extension}`, content, mimeType);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <FormControl sx={{ pt: 1 }}>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleExport}>Export</Button>
      </DialogActions>
    </Dialog>
  );
}

export default CsvExportDialog;
