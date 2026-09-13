import { useState } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { normalizeSeedTime } from '../seedTime'

/**
 * Shared `seedTime` row processing for the entries grids: normalizes valid
 * input (completing/adding the hundredths part) and clears + warns on input
 * that doesn't match either seed-time shape.
 *
 * `processRow` must only run once a row edit is actually committed (e.g. via
 * EditableDataGrid's processRowUpdate) — not from a column value getter/setter,
 * which the grid may invoke speculatively (autosizing, filtering, etc.) while
 * the user is still typing.
 */
export function useSeedTimeColumn<R extends { seedTime: string }>() {
  const [invalidOpen, setInvalidOpen] = useState(false)
  // Bumped on every new error so the Snackbar remounts and replaces any
  // still-open (or closing) instance instead of being a no-op on `open`.
  const [errorKey, setErrorKey] = useState(0)

  const processRow = (row: R): R => {
    const normalized = normalizeSeedTime(row.seedTime)
    if (normalized === undefined) {
      setInvalidOpen(true)
      setErrorKey((k) => k + 1)
      return { ...row, seedTime: '' }
    }
    return { ...row, seedTime: normalized }
  }

  // No autoHideDuration, and clickaway/escape are ignored: per EU accessibility
  // guidance, this must stay open until the user dismisses it via the X.
  const snackbar = (
    <Snackbar
      key={errorKey}
      open={invalidOpen}
      onClose={(_event, reason) => {
        if (reason === 'clickaway' || reason === 'escapeKeyDown') return
        setInvalidOpen(false)
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="error" variant="filled" onClose={() => setInvalidOpen(false)} sx={{ width: '100%' }}>
        Invalid seed time — must be M:SS.hh or SS.hh. Value was cleared.
      </Alert>
    </Snackbar>
  )

  return { processRow, snackbar }
}
