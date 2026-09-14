import { useMemo, useState } from 'react'
import type { GridColDef } from '@mui/x-data-grid'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import type { Athlete, IndividualEntry, RelayEntry } from '../types'
import EditableDataGrid from './EditableDataGrid'
import BulkAddAthletesDialog from './BulkAddAthletesDialog'
import CsvImportDialog, { type CsvImportColumn } from './CsvImportDialog'

interface AthletesGridProps {
  athletes: Athlete[]
  individualEntries: IndividualEntry[]
  relayEntries: RelayEntry[]
  onAdd: () => void
  onBulkAdd: (count: number) => void
  onImportCsv: (rows: { firstName: string; lastName: string; gender: string; classYear: string }[]) => void
  onUpdate: (athlete: Athlete) => void
  onDelete: (id: string) => void
  onClearAll: () => void
  readOnly?: boolean
  onReadOnlyAttempt?: () => void
}

type AthleteRow = Athlete & { individualEventCount: number; relayEventCount: number }

const GENDERS = ['G', 'B', 'W', 'M']
const GENDER_TOOLTIP = 'G = Girl, B = Boy, W = Woman, M = Man'
const MIN_CLASS_YEAR = 2027
const CLASS_YEAR_TOOLTIP = `Class year must be ${MIN_CLASS_YEAR} or later.`
const CLASS_YEARS = Array.from(
  { length: new Date().getFullYear() + 10 - MIN_CLASS_YEAR + 1 },
  (_, i) => MIN_CLASS_YEAR + i,
)

// The label needs its own overflow/shrink handling (rather than relying on the
// DataGrid's default header truncation) so the info icon always keeps its
// space and stays hoverable, even when the sort arrow claims room on hover.
function HeaderWithInfo({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden', minWidth: 0 }}>
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {label}
      </Box>
      <Tooltip title={tooltip}>
        <InfoOutlinedIcon fontSize="inherit" sx={{ color: 'action.active', flexShrink: 0 }} />
      </Tooltip>
    </Box>
  )
}

const columns: GridColDef<AthleteRow>[] = [
  { field: 'firstName', headerName: 'First Name', flex: 1, editable: true },
  { field: 'lastName', headerName: 'Last Name', flex: 1, editable: true },
  {
    field: 'gender',
    headerName: 'Gender',
    width: 100,
    editable: true,
    type: 'singleSelect',
    valueOptions: GENDERS,
    renderHeader: () => <HeaderWithInfo label="Gender" tooltip={GENDER_TOOLTIP} />,
  },
  {
    field: 'classYear',
    headerName: 'Class Year',
    width: 120,
    editable: true,
    type: 'singleSelect',
    valueOptions: CLASS_YEARS,
    renderHeader: () => <HeaderWithInfo label="Class Year" tooltip={CLASS_YEAR_TOOLTIP} />,
  },
  {
    field: 'individualEventCount',
    headerName: 'Individual Events',
    width: 130,
    type: 'number',
  },
  {
    field: 'relayEventCount',
    headerName: 'Relay Events',
    width: 120,
    type: 'number',
  },
]

const csvColumns: CsvImportColumn[] = [
  {
    key: 'firstName',
    label: 'First Name',
    validate: (value) => (value === '' ? 'First name is required.' : undefined),
  },
  {
    key: 'lastName',
    label: 'Last Name',
    validate: (value) => (value === '' ? 'Last name is required.' : undefined),
  },
  {
    key: 'gender',
    label: 'Gender',
    validate: (value) =>
      GENDERS.includes(value.toUpperCase()) ? undefined : `Gender must be one of ${GENDERS.join(', ')}.`,
    transform: (value) => value.toUpperCase(),
  },
  {
    key: 'classYear',
    label: 'Class Year',
    validate: (value) => {
      const year = Number.parseInt(value, 10)
      return Number.isInteger(year) && year >= MIN_CLASS_YEAR ? undefined : CLASS_YEAR_TOOLTIP
    },
  },
]

function AthletesGrid({
  athletes,
  individualEntries,
  relayEntries,
  onAdd,
  onBulkAdd,
  onImportCsv,
  onUpdate,
  onDelete,
  onClearAll,
  readOnly,
  onReadOnlyAttempt,
}: AthletesGridProps) {
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)

  const rows = useMemo<AthleteRow[]>(() => {
    const individualCounts = new Map<string, number>()
    for (const entry of individualEntries) {
      individualCounts.set(entry.athleteId, (individualCounts.get(entry.athleteId) ?? 0) + 1)
    }
    const relayCounts = new Map<string, number>()
    for (const entry of relayEntries) {
      const legAthleteIds = new Set(
        [entry.leg1AthleteId, entry.leg2AthleteId, entry.leg3AthleteId, entry.leg4AthleteId].filter(Boolean),
      )
      for (const athleteId of legAthleteIds) {
        relayCounts.set(athleteId, (relayCounts.get(athleteId) ?? 0) + 1)
      }
    }
    return athletes.map((athlete) => ({
      ...athlete,
      individualEventCount: individualCounts.get(athlete.id) ?? 0,
      relayEventCount: relayCounts.get(athlete.id) ?? 0,
    }))
  }, [athletes, individualEntries, relayEntries])

  return (
    <>
      <EditableDataGrid
        rows={rows}
        columns={columns}
        onAdd={onAdd}
        onUpdate={({ individualEventCount, relayEventCount, ...athlete }) => {
          void individualEventCount
          void relayEventCount
          onUpdate(athlete)
        }}
        onDelete={onDelete}
        addLabel="Add Athlete"
        noRowsLabel="No athletes"
        readOnly={readOnly}
        onReadOnlyAttempt={onReadOnlyAttempt}
        extraToolbar={
          <>
            <Button
              size="small"
              startIcon={<GroupAddIcon />}
              onClick={() => (readOnly ? onReadOnlyAttempt?.() : setBulkAddOpen(true))}
            >
              Bulk Add Athletes
            </Button>
            <Button
              size="small"
              startIcon={<UploadFileIcon />}
              onClick={() => (readOnly ? onReadOnlyAttempt?.() : setCsvImportOpen(true))}
            >
              Import CSV
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={() => (readOnly ? onReadOnlyAttempt?.() : onClearAll())}
              disabled={!readOnly && athletes.length === 0}
            >
              Clear All
            </Button>
          </>
        }
      />
      <BulkAddAthletesDialog
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        onAdd={onBulkAdd}
      />
      <CsvImportDialog
        open={csvImportOpen}
        title="Import Athletes CSV"
        columns={csvColumns}
        onClose={() => setCsvImportOpen(false)}
        onImport={(rows) =>
          onImportCsv(
            rows as { firstName: string; lastName: string; gender: string; classYear: string }[],
          )
        }
      />
    </>
  )
}

export default AthletesGrid
