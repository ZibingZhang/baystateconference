import { useRef, useState, type ChangeEvent } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import RadioGroup from '@mui/material/RadioGroup'
import Radio from '@mui/material/Radio'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import InputLabel from '@mui/material/InputLabel'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { parseDelimited } from '../csv'

export interface CsvImportColumn {
  key: string
  label: string
  /** Returns an error message for an invalid raw (trimmed) cell value, or undefined if valid. */
  validate: (value: string) => string | undefined
  /** Maps a validated raw value to the value that should be imported; defaults to the raw value. */
  transform?: (value: string) => string
}

interface CsvImportDialogProps {
  open: boolean
  title: string
  columns: CsvImportColumn[]
  onClose: () => void
  onImport: (rows: Record<string, string>[]) => void
}

type Step = 'select' | 'map' | 'errors'
type Separator = ',' | '\t'
type Mapping = Record<string, number | ''>

function CsvImportDialog({ open, title, columns, onClose, onImport }: CsvImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [separator, setSeparator] = useState<Separator>(',')
  const [step, setStep] = useState<Step>('select')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [dataRows, setDataRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Mapping>({})
  const [selectError, setSelectError] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])

  const reset = () => {
    setStep('select')
    setFileName('')
    setHeaders([])
    setDataRows([])
    setMapping({})
    setSelectError(null)
    setImportErrors([])
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    file
      .text()
      .then((text) => {
        const records = parseDelimited(text, separator)
        if (records.length === 0) {
          setSelectError('The file is empty.')
          return
        }
        const [fileHeaders, ...rows] = records
        if (fileHeaders.length < columns.length) {
          setSelectError(
            `This file has ${fileHeaders.length} column${fileHeaders.length === 1 ? '' : 's'}, ` +
              `but at least ${columns.length} are required.`,
          )
          return
        }
        const nonBlankRows = rows.filter((row) => row.some((cell) => cell.trim() !== ''))
        const guessed: Mapping = {}
        for (const column of columns) {
          const index = fileHeaders.findIndex(
            (header) => header.trim().toLowerCase() === column.label.toLowerCase(),
          )
          guessed[column.key] = index >= 0 ? index : ''
        }
        setSelectError(null)
        setFileName(file.name)
        setHeaders(fileHeaders)
        setDataRows(nonBlankRows)
        setMapping(guessed)
        setStep('map')
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Could not read this file.'
        setSelectError(`Failed to read "${file.name}": ${message}`)
      })
  }

  const handleMappingChange = (key: string, event: SelectChangeEvent<number | ''>) => {
    const value = event.target.value
    setMapping((prev) => ({ ...prev, [key]: value === '' ? '' : Number(value) }))
  }

  const allMapped = columns.every((c) => mapping[c.key] !== '' && mapping[c.key] !== undefined)
  const numericMappings = columns
    .map((c) => mapping[c.key])
    .filter((v): v is number => typeof v === 'number')
  const noDuplicates = new Set(numericMappings).size === numericMappings.length
  const canImport = allMapped && noDuplicates

  const handleImportClick = () => {
    if (!canImport) return
    const errors: string[] = []
    const finalRows: Record<string, string>[] = []
    dataRows.forEach((row, rowIndex) => {
      const finalRow: Record<string, string> = {}
      let rowHasError = false
      for (const column of columns) {
        const index = mapping[column.key]
        const raw = (typeof index === 'number' ? row[index] ?? '' : '').trim()
        const error = column.validate(raw)
        if (error) {
          errors.push(`Row ${rowIndex + 2}, ${column.label}: ${error}`)
          rowHasError = true
          continue
        }
        finalRow[column.key] = column.transform ? column.transform(raw) : raw
      }
      if (!rowHasError) finalRows.push(finalRow)
    })
    if (errors.length > 0) {
      setImportErrors(errors)
      setStep('errors')
      return
    }
    onImport(finalRows)
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {step === 'select' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl>
              <FormLabel sx={{ mb: 1 }}>Separator</FormLabel>
              <RadioGroup
                row
                value={separator}
                onChange={(event) => setSeparator(event.target.value as Separator)}
              >
                <FormControlLabel value="," control={<Radio />} label="Comma" />
                <FormControlLabel value={'\t'} control={<Radio />} label="Tab" />
              </RadioGroup>
            </FormControl>
            <Button variant="outlined" onClick={() => fileInputRef.current?.click()}>
              Choose File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              hidden
              onChange={handleFileChange}
            />
            {selectError && <Alert severity="error">{selectError}</Alert>}
          </Box>
        )}
        {step === 'map' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {fileName} — match each field to a column from your file.
            </Typography>
            {columns.map((column) => (
              <FormControl key={column.key} fullWidth size="small">
                <InputLabel id={`csv-map-${column.key}`}>{column.label}</InputLabel>
                <Select<number | ''>
                  labelId={`csv-map-${column.key}`}
                  label={column.label}
                  value={mapping[column.key] ?? ''}
                  onChange={(event) => handleMappingChange(column.key, event)}
                >
                  <MenuItem value="">
                    <em>-- Select column --</em>
                  </MenuItem>
                  {headers.map((header, index) => (
                    <MenuItem key={index} value={index}>
                      {header || `Column ${index + 1}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
            {!noDuplicates && (
              <Alert severity="error">Each field must be mapped to a different column.</Alert>
            )}
          </Box>
        )}
        {step === 'errors' && (
          <Box sx={{ pt: 1 }}>
            <Alert severity="error" sx={{ mb: 1 }}>
              Import cancelled — every row must be valid. Fix these issues in your file and try
              again.
            </Alert>
            <List dense sx={{ maxHeight: 320, overflowY: 'auto' }}>
              {importErrors.map((message, index) => (
                <ListItem key={index} disableGutters>
                  <ListItemText primary={message} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {step === 'map' && <Button onClick={() => setStep('select')}>Back</Button>}
        {step === 'errors' && <Button onClick={() => setStep('map')}>Back</Button>}
        <Button onClick={handleClose}>Cancel</Button>
        {step === 'map' && (
          <Button onClick={handleImportClick} disabled={!canImport}>
            Import
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default CsvImportDialog
