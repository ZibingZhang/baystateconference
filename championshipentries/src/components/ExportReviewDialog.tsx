import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import type { ExportReview } from "../domain/hy3Export";

interface ExportReviewDialogProps {
  review: ExportReview | null;
  onClose: () => void;
  onConfirm: () => void;
}

function ExportReviewDialog({ review, onClose, onConfirm }: ExportReviewDialogProps) {
  if (!review) return null;
  const { overLimitEvents, duplicateIndividualEntries, duplicateRelayEntries, skippedEvents } =
    review;
  const totalSkipped = skippedEvents.reduce((sum, e) => sum + e.count, 0);
  const hasIssues =
    overLimitEvents.length > 0 ||
    duplicateIndividualEntries.length > 0 ||
    duplicateRelayEntries.length > 0 ||
    skippedEvents.length > 0;

  return (
    <Dialog open={review !== null} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Review Before Export</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {!hasIssues && <Alert severity="success">No issues found — ready to export.</Alert>}
          {overLimitEvents.length > 0 && (
            <Alert severity="error">
              <AlertTitle>Events Over the Entry Limit</AlertTitle>
              <List dense disablePadding>
                {overLimitEvents.map((issue, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemText
                      primary={issue.event}
                      secondary={`${issue.count} entries, limit is ${issue.limit}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
          {duplicateIndividualEntries.length > 0 && (
            <Alert severity="error">
              <AlertTitle>Duplicate Individual Entries</AlertTitle>
              <List dense disablePadding>
                {duplicateIndividualEntries.map((dup, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemText
                      primary={`${dup.athleteName} — ${dup.event}`}
                      secondary={`Entered ${dup.count} times`}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
          {duplicateRelayEntries.length > 0 && (
            <Alert severity="error">
              <AlertTitle>Duplicate Relay Entries</AlertTitle>
              <List dense disablePadding>
                {duplicateRelayEntries.map((dup, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemText
                      primary={`Relay ${dup.relayLetter} — ${dup.event}`}
                      secondary={`Entered ${dup.count} times`}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
          {skippedEvents.length > 0 && (
            <Alert severity="warning">
              <AlertTitle>Entries That Will Be Skipped ({totalSkipped})</AlertTitle>
              <List dense disablePadding>
                {skippedEvents.map((skipped, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemText
                      primary={skipped.event}
                      secondary={`${skipped.count} ${skipped.count === 1 ? "entry" : "entries"} skipped (${skipped.kind})`}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
          {hasIssues && (
            <Typography variant="body2" color="text.secondary">
              You can export anyway — skipped entries won't be included in the HY3 file, and
              duplicate or over-limit entries will still be exported as-is.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color={hasIssues ? "warning" : "primary"} onClick={onConfirm}>
          {hasIssues ? "Export Anyway" : "Export"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ExportReviewDialog;
