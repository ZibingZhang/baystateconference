import { useRef } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import ClearIcon from '@mui/icons-material/Clear'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import type { ImportedEvent } from '../types'
import { parseEv3 } from '../ev3'

interface EventsGridProps {
  fileName: string | undefined
  events: ImportedEvent[] | undefined
  onImport: (fileName: string, events: ImportedEvent[], rawText: string) => void
  onImportError: (message: string) => void
  onClear: () => void
  readOnly?: boolean
  onReadOnlyAttempt?: () => void
}

const columns: GridColDef<ImportedEvent & { id: number }>[] = [
  { field: 'eventNumber', headerName: 'Event #', width: 90 },
  { field: 'displayName', headerName: 'Event', flex: 1 },
  { field: 'gender', headerName: 'Gender', width: 90 },
  { field: 'round', headerName: 'Round', width: 90 },
  { field: 'scheduledTime', headerName: 'Scheduled Time', width: 140 },
]

function EventsGrid({
  fileName,
  events,
  onImport,
  onImportError,
  onClear,
  readOnly,
  onReadOnlyAttempt,
}: EventsGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    file
      .text()
      .then((text) => {
        const result = parseEv3(text)
        onImport(file.name, result.events, text)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Could not read this file.'
        onImportError(`Failed to import "${file.name}": ${message}`)
      })
  }

  const rows = (events ?? []).map((event, index) => ({ ...event, id: index }))

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          size="small"
          startIcon={<UploadFileIcon />}
          onClick={() => (readOnly ? onReadOnlyAttempt?.() : fileInputRef.current?.click())}
        >
          Import EV3 File
        </Button>
        {events && events.length > 0 && (
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={() => (readOnly ? onReadOnlyAttempt?.() : onClear())}
          >
            Clear Import
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".ev3"
          hidden
          onChange={handleFileChange}
        />
        {fileName && (
          <Typography variant="body2" color="text.secondary">
            Imported from {fileName}
          </Typography>
        )}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          localeText={{ noRowsLabel: 'No events imported' }}
        />
      </Box>
    </Box>
  )
}

export default EventsGrid
