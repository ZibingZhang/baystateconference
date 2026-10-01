import { useRef, useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

/**
 * A dismissible error banner shared by every grid rejection/validation
 * message (pasted values that don't match a select option, seed times that
 * fail format or a qualifying standard, ...). `notify` replaces whatever is
 * currently showing — even a repeat of the same message — so a second
 * blocked attempt always re-surfaces the banner instead of being a no-op.
 *
 * The close button's handlers exist for a specific, non-obvious reason: the
 * grid's own "click outside the focused cell" detector (MUI's
 * `useGridFocus`'s `handleDocumentClick`) listens for `mouseup` on
 * `document`, not `click`. Stopping propagation in `onClick` is too late —
 * by then the document-level listener has already run, treated this click as
 * a blur, and (if a cell is mid-edit with a validation error) refired the
 * same rejection before the click ever reaches `onClick`. Stopping it on
 * `onMouseUp` instead keeps it from ever reaching `document`.
 * `onMouseDown`'s `preventDefault` additionally stops the native focus-steal
 * a click would otherwise cause. Both matter, which is why this isn't just
 * Alert's built-in `onClose` button.
 */
export function useGridAlertBanner() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  // Bumped on every notify() so the Snackbar remounts and replaces any
  // still-open (or closing) instance instead of being a no-op on `open`.
  const [key, setKey] = useState(0);
  // Set only when the caller passes `refocus`, so dismissing can return focus
  // to a cell that's still mid-edit — callers with nothing to refocus (e.g. a
  // paste rejection, where no cell is left in edit mode) just omit it.
  const refocusRef = useRef<(() => void) | null>(null);

  const notify = (nextMessage: string, refocus?: () => void) => {
    refocusRef.current = refocus ?? null;
    setMessage(nextMessage);
    setOpen(true);
    setKey((k) => k + 1);
  };

  const dismiss = () => {
    setOpen(false);
    refocusRef.current?.();
    refocusRef.current = null;
  };

  // No autoHideDuration, and clickaway/escape are ignored: per EU accessibility
  // guidance, this must stay open until the user dismisses it via the X.
  const banner = (
    <Snackbar
      key={key}
      open={open}
      onClose={(_event, reason) => {
        if (reason === "clickaway" || reason === "escapeKeyDown") return;
        dismiss();
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity="error"
        variant="filled"
        sx={{ width: "100%" }}
        action={
          <IconButton
            size="small"
            color="inherit"
            aria-label="Close"
            onMouseDown={(e) => e.preventDefault()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={dismiss}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        {message}
      </Alert>
    </Snackbar>
  );

  return { notify, banner };
}
