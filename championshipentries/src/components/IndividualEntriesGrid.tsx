import { useMemo, useState } from 'react'
import type { GridColDef } from '@mui/x-data-grid'
import Button from '@mui/material/Button'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'
import type { Athlete, ImportedEvent, IndividualEntry } from '../types'
import EditableDataGrid from './EditableDataGrid'
import BulkAddEntriesDialog from './BulkAddEntriesDialog'
import CsvImportDialog, { type CsvImportColumn } from './CsvImportDialog'
import CsvExportDialog from './CsvExportDialog'
import { useSeedTimeColumn } from './useSeedTimeColumn'
import { normalizeSeedTime } from '../seedTime'
import { athleteNameMatchError, findAthleteIdByName } from '../athleteMatch'

const NO_EVENTS_TOOLTIP =
  'Import an EV3 events file on the Events tab before choosing an event.'

function matchEventName(value: string, options: string[]): string | undefined {
  const target = value.toLowerCase()
  return options.find((option) => option.toLowerCase() === target)
}

interface IndividualEntriesGridProps {
  entries: IndividualEntry[]
  athletes: Athlete[]
  eventOptions?: string[]
  importedEvents?: ImportedEvent[]
  onAdd: () => void
  onBulkAdd: (count: number, eventNames: string[]) => void
  onImportCsv: (rows: { event: string; athleteId: string; seedTime: string }[]) => void
  onUpdate: (entry: IndividualEntry) => void
  onDelete: (id: string) => void
  onClearAll: () => void
  readOnly?: boolean
  onReadOnlyAttempt?: () => void
}

function IndividualEntriesGrid({
  entries,
  athletes,
  eventOptions,
  importedEvents,
  onAdd,
  onBulkAdd,
  onImportCsv,
  onUpdate,
  onDelete,
  onClearAll,
  readOnly,
  onReadOnlyAttempt,
}: IndividualEntriesGridProps) {
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [csvExportOpen, setCsvExportOpen] = useState(false)
  const { processRow: processSeedTimeRow, snackbar: seedTimeSnackbar } = useSeedTimeColumn<IndividualEntry>()

  const eventNumberByName = useMemo(() => {
    const map = new Map<string, number>()
    for (const event of importedEvents ?? []) {
      if (!map.has(event.displayName)) {
        map.set(event.displayName, event.eventNumber)
      }
    }
    return map
  }, [importedEvents])

  const csvColumns: CsvImportColumn[] = useMemo(
    () => [
      {
        key: 'event',
        label: 'Event',
        validate: (value) =>
          matchEventName(value, eventOptions ?? []) !== undefined
            ? undefined
            : 'Event does not match an imported event name.',
        transform: (value) => matchEventName(value, eventOptions ?? []) ?? value,
      },
      {
        key: 'athleteId',
        label: 'Athlete',
        validate: (value) => athleteNameMatchError(value, athletes),
        transform: (value) => findAthleteIdByName(value, athletes) ?? '',
      },
      {
        key: 'seedTime',
        label: 'Seed Time',
        validate: (value) =>
          value === '' || normalizeSeedTime(value) !== undefined
            ? undefined
            : 'Invalid seed time — must be M:SS.hh or SS.hh.',
        transform: (value) => normalizeSeedTime(value) ?? '',
      },
    ],
    [eventOptions, athletes],
  )

  const athleteOptions = athletes
    .filter((a) => `${a.firstName} ${a.lastName}`.trim() !== '')
    .map((a) => ({
      value: a.id,
      label: `${a.firstName} ${a.lastName}`.trim(),
    }))

  const athleteNameById = new Map(athletes.map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]))

  const columns: GridColDef<IndividualEntry>[] = [
    {
      field: 'event',
      headerName: 'Event',
      flex: 1,
      editable: (eventOptions?.length ?? 0) > 0,
      type: 'singleSelect',
      valueOptions: eventOptions ?? [],
      description: eventOptions?.length ? undefined : NO_EVENTS_TOOLTIP,
      sortComparator: (v1, v2) =>
        (eventNumberByName.get(v1) ?? Number.MAX_SAFE_INTEGER) -
        (eventNumberByName.get(v2) ?? Number.MAX_SAFE_INTEGER),
    },
    {
      field: 'athleteId',
      headerName: 'Athlete',
      flex: 1,
      editable: true,
      type: 'singleSelect',
      valueOptions: athleteOptions,
    },
    { field: 'seedTime', headerName: 'Seed Time', flex: 1, editable: true },
  ]

  return (
    <>
      <EditableDataGrid
        rows={entries}
        columns={columns}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        processRow={processSeedTimeRow}
        addLabel="Add Entry"
        noRowsLabel="No entries"
        readOnly={readOnly}
        onReadOnlyAttempt={onReadOnlyAttempt}
        extraToolbar={
          <>
            <Button
              size="small"
              startIcon={<PlaylistAddIcon />}
              onClick={() => (readOnly ? onReadOnlyAttempt?.() : setBulkAddOpen(true))}
              disabled={!readOnly && !eventOptions?.length}
            >
              Bulk Add Entries
            </Button>
            <Button
              size="small"
              startIcon={<UploadFileIcon />}
              onClick={() => (readOnly ? onReadOnlyAttempt?.() : setCsvImportOpen(true))}
              disabled={!readOnly && !eventOptions?.length}
            >
              Import CSV
            </Button>
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => setCsvExportOpen(true)}
              disabled={entries.length === 0}
            >
              Export CSV
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={() => (readOnly ? onReadOnlyAttempt?.() : onClearAll())}
              disabled={!readOnly && entries.length === 0}
            >
              Clear All
            </Button>
          </>
        }
      />
      <BulkAddEntriesDialog
        open={bulkAddOpen}
        title="Bulk Add Individual Entries"
        events={importedEvents}
        relay={false}
        onClose={() => setBulkAddOpen(false)}
        onAdd={onBulkAdd}
      />
      <CsvImportDialog
        open={csvImportOpen}
        title="Import Individual Entries CSV"
        columns={csvColumns}
        onClose={() => setCsvImportOpen(false)}
        onImport={(rows) =>
          onImportCsv(rows as { event: string; athleteId: string; seedTime: string }[])
        }
      />
      <CsvExportDialog
        open={csvExportOpen}
        title="Export Individual Entries CSV"
        fileNamePrefix="Individual Entries"
        headers={['Event', 'Athlete', 'Seed Time']}
        rows={entries.map((entry) => [
          entry.event,
          athleteNameById.get(entry.athleteId) ?? '',
          entry.seedTime,
        ])}
        onClose={() => setCsvExportOpen(false)}
      />
      {seedTimeSnackbar}
    </>
  )
}

export default IndividualEntriesGrid
