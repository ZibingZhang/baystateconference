import type { Ref, RefCallback } from 'react'
import { useEffect, useRef, useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import {
  useGridApiContext,
  type GridRenderEditCellParams,
  type GridSingleSelectColDef,
} from '@mui/x-data-grid'

// Matches `query`'s characters, in order, anywhere within `label` (case-insensitive).
function isSubsequenceMatch(query: string, label: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const l = label.toLowerCase()
  let qi = 0
  for (let li = 0; li < l.length && qi < q.length; li += 1) {
    if (l[li] === q[qi]) qi += 1
  }
  return qi === q.length
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === 'function') ref(value)
      else (ref as { current: T | null }).current = value
    }
  }
}

interface FilterableSingleSelectEditCellProps extends GridRenderEditCellParams {
  /** Called when the user commits (Enter/Tab/blur) typed text matching no option. */
  onInvalidCommit?: () => void
}

function FilterableSingleSelectEditCell({ onInvalidCommit, ...params }: FilterableSingleSelectEditCellProps) {
  const { id, field, value, colDef, row, hasFocus } = params
  const apiRef = useGridApiContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const singleSelectColDef = colDef.type === 'singleSelect' ? (colDef as GridSingleSelectColDef) : null

  const valueOptions =
    (typeof singleSelectColDef?.valueOptions === 'function'
      ? singleSelectColDef.valueOptions({ field, id, row })
      : singleSelectColDef?.valueOptions) ?? []
  const selectedOption = singleSelectColDef
    ? (valueOptions.find((option) => singleSelectColDef.getOptionValue(option) === value) ?? null)
    : null

  // Lazy-initialized once from the cell's starting value: this component is
  // remounted fresh each time a cell enters edit mode, so there's no need to
  // keep re-syncing this from props afterward.
  const [inputValue, setInputValue] = useState(() =>
    selectedOption && singleSelectColDef ? singleSelectColDef.getOptionLabel(selectedOption) : '',
  )
  // Mirrors `inputValue` for the cellEditStop listener below, so that
  // listener doesn't need to resubscribe on every keystroke.
  const inputValueRef = useRef(inputValue)

  useEffect(() => {
    if (hasFocus) inputRef.current?.focus()
  }, [hasFocus])

  // The grid ends editing (Enter/Tab/Escape/clicking away) via its own
  // `cellEditStop` event whenever the user didn't pick an option through
  // `onChange` — which covers plain-typed garbage committed by Enter or Tab,
  // neither of which reaches the Autocomplete's own `onClose` (MUI's Enter
  // handling only calls it when freeSolo is set or an option is highlighted,
  // and Tab isn't handled by Autocomplete at all). Escape means "cancel", not
  // a rejection, so it's excluded.
  useEffect(() => {
    if (!singleSelectColDef) return
    return apiRef.current.subscribeEvent('cellEditStop', (stopParams) => {
      if (stopParams.id !== id || stopParams.field !== field) return
      if (stopParams.reason === 'escapeKeyDown') return
      const currentInput = inputValueRef.current
      if (currentInput === '') return
      const matches = valueOptions.some(
        (option) => singleSelectColDef.getOptionLabel(option) === currentInput,
      )
      if (!matches) onInvalidCommit?.()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRef, id, field])

  if (!singleSelectColDef) return null
  const getOptionLabel = singleSelectColDef.getOptionLabel
  const getOptionValue = singleSelectColDef.getOptionValue

  return (
    <Autocomplete
      options={valueOptions}
      value={selectedOption}
      inputValue={inputValue}
      onInputChange={(_event, newInputValue) => {
        inputValueRef.current = newInputValue
        setInputValue(newInputValue)
      }}
      getOptionLabel={getOptionLabel}
      getOptionKey={(option) => String(getOptionValue(option))}
      isOptionEqualToValue={(option, val) => getOptionValue(option) === getOptionValue(val)}
      filterOptions={(options, state) =>
        options.filter((option) => isSubsequenceMatch(state.inputValue, getOptionLabel(option)))
      }
      onChange={(_event, newValue) => {
        apiRef.current.setEditCellValue({
          id,
          field,
          value: newValue ? getOptionValue(newValue) : '',
        })
        apiRef.current.stopCellEditMode({ id, field })
      }}
      fullWidth
      openOnFocus
      autoHighlight
      size="small"
      sx={{ height: '100%', '& .MuiInputBase-root': { height: '100%' } }}
      renderInput={(inputParams) => (
        <TextField
          {...inputParams}
          variant="standard"
          sx={{ px: 1, height: '100%', display: 'flex', alignItems: 'center' }}
          slotProps={{
            ...inputParams.slotProps,
            input: { ...inputParams.slotProps.input, disableUnderline: true },
            htmlInput: {
              ...inputParams.slotProps.htmlInput,
              ref: mergeRefs(inputParams.slotProps.htmlInput.ref, inputRef),
            },
          }}
        />
      )}
    />
  )
}

export default FilterableSingleSelectEditCell
