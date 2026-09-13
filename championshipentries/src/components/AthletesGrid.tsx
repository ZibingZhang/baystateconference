import { useState } from 'react'
import type { GridColDef } from '@mui/x-data-grid'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import type { Athlete } from '../types'
import EditableDataGrid from './EditableDataGrid'
import BulkAddAthletesDialog from './BulkAddAthletesDialog'
import CsvImportDialog, { type CsvImportColumn } from './CsvImportDialog'

interface AthletesGridProps {
  athletes: Athlete[]
  onAdd: () => void
  onBulkAdd: (count: number) => void
  onImportCsv: (rows: { firstName: string; lastName: string; gender: string; classYear: string }[]) => void
  onUpdate: (athlete: Athlete) => void
  onDelete: (id: string) => void
  onClearAll: () => void
  readOnly?: boolean
  onReadOnlyAttempt?: () => void
}

const GENDERS = ['G', 'B', 'W', 'M']
const GENDER_TOOLTIP = 'G = Girl, B = Boy, W = Woman, M = Man'
const MIN_CLASS_YEAR = 2027
const CLASS_YEAR_TOOLTIP = `Class year must be ${MIN_CLASS_YEAR} or later.`
const CLASS_YEARS = Array.from(
  { length: new Date().getFullYear() + 10 - MIN_CLASS_YEAR + 1 },
  (_, i) => MIN_CLASS_YEAR + i,
)

function HeaderWithInfo({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <span>{label}</span>
      <Tooltip title={tooltip}>
        <InfoOutlinedIcon fontSize="inherit" sx={{ color: 'action.active' }} />
      </Tooltip>
    </Box>
  )
}

const columns: GridColDef<Athlete>[] = [
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

  return (
    <>
      <EditableDataGrid
        rows={athletes}
        columns={columns}
        onAdd={onAdd}
        onUpdate={onUpdate}
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
