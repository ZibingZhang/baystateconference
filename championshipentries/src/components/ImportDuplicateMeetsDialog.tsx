import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { DuplicateMeetResolution, DuplicateMeetRow } from "../hooks/useAppDataBackup";

interface ImportDuplicateMeetsDialogProps {
  open: boolean;
  duplicates: DuplicateMeetRow[];
  onChangeResolution: (meetId: string, resolution: DuplicateMeetResolution) => void;
  onApply: () => void;
  onCancel: () => void;
}

function ImportDuplicateMeetsDialog({
  open,
  duplicates,
  onChangeResolution,
  onApply,
  onCancel,
}: ImportDuplicateMeetsDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>Meets Already Exist</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {duplicates.length === 1
            ? "This backup has a meet that shares an id with an existing meet."
            : `This backup has ${duplicates.length} meets that share an id with existing meets.`}{" "}
          Choose, per meet, whether to keep the existing one or replace it — along with all of its
          athletes and entries — with the version from the backup.
        </DialogContentText>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Meet</TableCell>
              <TableCell align="right">Decision</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {duplicates.map((d) => (
              <TableRow key={d.importedMeet.id}>
                <TableCell>
                  <Typography variant="body2">{d.existingMeet.name}</Typography>
                  {d.importedMeet.name !== d.existingMeet.name && (
                    <Typography variant="caption" color="text.secondary">
                      Backup names it "{d.importedMeet.name}"
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={d.resolution}
                    onChange={(_e, value: DuplicateMeetResolution | null) =>
                      value && onChangeResolution(d.importedMeet.id, value)
                    }
                  >
                    <ToggleButton value="keep">Keep Existing</ToggleButton>
                    <ToggleButton value="replace">Replace</ToggleButton>
                  </ToggleButtonGroup>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onApply} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ImportDuplicateMeetsDialog;
