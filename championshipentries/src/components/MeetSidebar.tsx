import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import type { Meet, MeetTemplate } from '../types'

const DEFAULT_SIDEBAR_WIDTH = 240
const MIN_SIDEBAR_WIDTH = 160
const MAX_SIDEBAR_WIDTH = 480
const SIDEBAR_WIDTH_STORAGE_KEY = 'meetSidebarWidth'

interface MeetSidebarProps {
  open: boolean
  meets: Meet[]
  selectedMeetId: string | null
  onSelectMeet: (id: string) => void
  onAddMeet: () => void
  onDeleteMeet: (id: string) => void
  onCopyMeet: (id: string) => void
  onRenameMeet: (id: string, name: string) => void
  templates: MeetTemplate[]
  selectedTemplateId: string | null
  onSelectTemplate: (id: string) => void
  onCopyTemplate: (id: string) => void
}

function MeetSidebar({
  open,
  meets,
  selectedMeetId,
  onSelectMeet,
  onAddMeet,
  onDeleteMeet,
  onCopyMeet,
  onRenameMeet,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onCopyTemplate,
}: MeetSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY))
    return saved >= MIN_SIDEBAR_WIDTH && saved <= MAX_SIDEBAR_WIDTH ? saved : DEFAULT_SIDEBAR_WIDTH
  })
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width))
  }, [width])

  useEffect(() => {
    if (!isResizing) return
    const handleMouseMove = (event: MouseEvent) => {
      setWidth(
        Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, event.clientX)),
      )
    }
    const handleMouseUp = () => {
      setIsResizing(false)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const startResizing = () => {
    setIsResizing(true)
  }

  const startEditing = (meet: Meet) => {
    setEditingId(meet.id)
    setEditValue(meet.name)
  }

  const commitEdit = () => {
    if (editingId) {
      onRenameMeet(editingId, editValue)
    }
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitEdit()
    } else if (event.key === 'Escape') {
      cancelEdit()
    }
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: open ? width : 0,
        flexShrink: 0,
        overflow: 'hidden',
        transition: isResizing ? 'none' : 'width 0.2s',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Meet Templates
        </Typography>
      </Box>
      <Divider />
      <List sx={{ width, py: 0 }}>
        {templates.map((template) => (
          <ListItem
            key={template.id}
            disablePadding
            secondaryAction={
              <IconButton
                edge="end"
                size="small"
                aria-label="Copy template into a new meet"
                onClick={() => onCopyTemplate(template.id)}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemButton
              selected={template.id === selectedTemplateId}
              onClick={() => onSelectTemplate(template.id)}
            >
              <ListItemText primary={template.name} />
            </ListItemButton>
          </ListItem>
        ))}
        {templates.length === 0 && (
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No templates yet
            </Typography>
          </Box>
        )}
      </List>
      <Divider />
      <Box
        sx={{
          width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Meets
        </Typography>
        <IconButton size="small" onClick={onAddMeet} aria-label="Add meet">
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider />
      <Box sx={{ width, flex: 1, overflowY: 'auto' }}>
      <List sx={{ py: 0 }}>
        {meets.map((meet) => (
          <ListItem
            key={meet.id}
            disablePadding
            secondaryAction={
              editingId === meet.id ? null : (
                <Box sx={{ display: 'flex' }}>
                  <IconButton
                    edge="end"
                    size="small"
                    aria-label="Copy meet"
                    onClick={() => onCopyMeet(meet.id)}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    edge="end"
                    size="small"
                    aria-label="Delete meet"
                    onClick={() => onDeleteMeet(meet.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )
            }
          >
            {editingId === meet.id ? (
              <Box sx={{ flex: 1, px: 2, py: 0.5 }}>
                <TextField
                  autoFocus
                  size="small"
                  fullWidth
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleEditKeyDown}
                />
              </Box>
            ) : (
              <ListItemButton
                selected={meet.id === selectedMeetId}
                onClick={() => onSelectMeet(meet.id)}
                onDoubleClick={() => startEditing(meet)}
              >
                <ListItemText primary={meet.name} />
              </ListItemButton>
            )}
          </ListItem>
        ))}
        {meets.length === 0 && (
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No meets yet
            </Typography>
          </Box>
        )}
      </List>
      </Box>
      {open && (
        <Box
          onMouseDown={startResizing}
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 6,
            cursor: 'col-resize',
            '&:hover': { bgcolor: 'divider' },
          }}
        />
      )}
    </Box>
  )
}

export default MeetSidebar
