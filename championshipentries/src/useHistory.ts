import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppData } from './types'

const MAX_HISTORY = 50

interface HistoryEntry {
  before: AppData
  after: AppData
}

/**
 * In-memory (never persisted) undo/redo history covering every data mutation
 * in the app — row adds/updates/deletes, clear-all, bulk add, CSV import,
 * meet add/delete/copy/rename, etc. Each call to `update` is recorded as one
 * step; calls made in the same synchronous burst (e.g. every row touched by
 * one paste) are batched into a single undo step via a microtask flush.
 * Capped at MAX_HISTORY steps so memory doesn't grow unbounded.
 */
export function useHistory(data: AppData, setData: Dispatch<SetStateAction<AppData>>) {
  const [past, setPast] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])
  // Mirrors what `data` will be once React commits, updated synchronously
  // inside `update` so a burst of calls in one tick each see the effect of
  // the ones before it, even though `data` itself won't reflect that until
  // the next render.
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const pendingBeforeRef = useRef<AppData | null>(null)
  const pendingAfterRef = useRef<AppData | null>(null)
  const flushScheduledRef = useRef(false)

  function recordChange(before: AppData, after: AppData) {
    if (before === after) return
    if (pendingBeforeRef.current === null) pendingBeforeRef.current = before
    pendingAfterRef.current = after
    if (flushScheduledRef.current) return
    flushScheduledRef.current = true
    queueMicrotask(() => {
      flushScheduledRef.current = false
      const entryBefore = pendingBeforeRef.current
      const entryAfter = pendingAfterRef.current
      pendingBeforeRef.current = null
      pendingAfterRef.current = null
      if (entryBefore === null || entryAfter === null || entryBefore === entryAfter) return
      setPast((prev) => {
        const next = [...prev, { before: entryBefore, after: entryAfter }]
        return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
      })
      setFuture([])
    })
  }

  function update(updater: (prev: AppData) => AppData) {
    const before = dataRef.current
    const after = updater(before)
    dataRef.current = after
    recordChange(before, after)
    setData(updater)
  }

  function undo() {
    if (past.length === 0) return
    const entry = past[past.length - 1]
    dataRef.current = entry.before
    setData(entry.before)
    setPast(past.slice(0, -1))
    setFuture([...future, entry])
  }

  function redo() {
    if (future.length === 0) return
    const entry = future[future.length - 1]
    dataRef.current = entry.after
    setData(entry.after)
    setFuture(future.slice(0, -1))
    setPast([...past, entry])
  }

  const latestRef = useRef({ undo, redo })
  useEffect(() => {
    latestRef.current = { undo, redo }
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return
      const key = event.key.toLowerCase()
      const isRedo = key === 'y' || (key === 'z' && event.shiftKey)
      const isUndo = key === 'z' && !event.shiftKey
      if (!isRedo && !isUndo) return
      // Defer to the browser's own text-field undo while actively editing a
      // cell's text (or any other input) — don't fight it with app-level undo.
      const active = document.activeElement
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return
      event.preventDefault()
      if (isRedo) latestRef.current.redo()
      else latestRef.current.undo()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return { update, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 }
}
