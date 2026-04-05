import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  DndContext, closestCenter,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SHEET_NAMES } from '../config.js'
import StatusChip from '../components/ui/StatusChip.jsx'
import { Filter, GripVertical, Target, X, Save } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const ROW_H   = 36
const LABEL_W = 200

// Watchtower column names for each Gantt stage's START date
const STAGE_START_FIELD = {
  'Scope Discovery': 'Module Scope Discovery Start',
  'Development':     'Module Development Start',
  'UAT':             'Module UAT Start',
  'Migration':       'Migration Start Date',
  'Go-Live':         'Module Go Live Date',
}
// Watchtower column names for each Gantt stage's END date (= next stage start)
const STAGE_END_FIELD = {
  'Scope Discovery': 'Module Development Start',
  'Development':     'Module UAT Start',
  'UAT':             'Migration Start Date',
  'Migration':       'Module Go Live Date',
  'Go-Live':         null,
}

const STAGE_COLORS = {
  'Scope Discovery':         { bg: '#64748b', text: '#fff' },
  'Development':             { bg: '#3b82f6', text: '#fff' },
  'UAT':                     { bg: '#f59e0b', text: '#fff' },
  'Migration':               { bg: '#8b5cf6', text: '#fff' },
  'Go-Live':                 { bg: '#10b981', text: '#fff' },
  'Sustenance':              { bg: '#14b8a6', text: '#fff' },
  'Increment - Feature':     { bg: '#f97316', text: '#fff' },
  'Increment - Bug':         { bg: '#ef4444', text: '#fff' },
  'Increment - Data Import': { bg: '#eab308', text: '#000' },
}
// Valid values for Watchtower Roadmap col I (Stage - L3 Lifecycle)
// 'Go-Live' and 'Increment-*' are Phase Gantt visualization labels only — not Watchtower values
const WATCHTOWER_STAGES = ['Scope Discovery', 'Development', 'UAT', 'Migration', 'Sustenance']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDateStr(str) {
  if (!str) return null
  const p = str.split('/')
  if (p.length === 3) {
    const [d, m, y] = p.map(Number)
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m - 1, d)
  }
  return null
}

function fmtDate(d) {
  if (!d) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function dateToStr(d) {
  if (!d) return ''
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function dateToInputVal(d) {
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function inputValToDate(val) {
  if (!val) return null
  const [y, m, d] = val.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function colLetter(idx) {
  if (idx < 0) return ''
  let result = '', n = idx + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    result = String.fromCharCode(65 + rem) + result
    n = Math.floor((n - 1) / 26)
  }
  return result
}

function getMonthsBetween(start, end) {
  const months = []
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cur <= last) {
    months.push(new Date(cur))
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

// ─── SortableRow ──────────────────────────────────────────────────────────────
function SortableRow({
  id, module, moduleTasks,
  months, pct, timeStart, timeEnd,
  token, onBarPointerDown, onBarClick,
  localEdits, activeBarId, dragPreview,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : 'auto',
    height: ROW_H,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex border-b border-gray-100 dark:border-surface-700/50 bg-white dark:bg-surface-800"
    >
      {/* Label */}
      <div
        style={{ width: LABEL_W, minWidth: LABEL_W }}
        className="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-surface-600/40 flex-shrink-0"
      >
        {token ? (
          <button
            {...attributes}
            {...listeners}
            className="flex-shrink-0 p-0.5 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing rounded touch-none"
            tabIndex={-1}
          >
            <GripVertical size={12} />
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <span
          className="text-xs font-body text-gray-700 dark:text-gray-300 truncate"
          title={module}
        >
          {module}
        </span>
      </div>

      {/* Timeline area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Month grid lines */}
        {months.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-r border-gray-100 dark:border-surface-700/30 pointer-events-none"
            style={{ left: `${pct(new Date(m.getFullYear(), m.getMonth() + 1, 1))}%` }}
          />
        ))}

        {/* Task bars */}
        {moduleTasks.map(t => {
          const edit = localEdits[t.id]
          const isActive = activeBarId === t.id
          const s = isActive && dragPreview ? dragPreview.start : (edit?.start ?? t.start)
          const e = isActive && dragPreview ? dragPreview.end   : (edit?.end   ?? t.end)
          const stage = edit?.stage ?? t.stage

          const left  = Math.max(0, pct(s))
          const right = Math.min(100, pct(e))
          const width = right - left
          if (width <= 0) return null

          const c = STAGE_COLORS[stage] || { bg: '#6b7280', text: '#fff' }

          return (
            <div
              key={t.id}
              className="absolute top-1.5 bottom-1.5 flex select-none"
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              {/* Bar body */}
              <div
                className={[
                  'flex-1 rounded-l flex items-center overflow-hidden px-1.5 min-w-0',
                  token
                    ? 'cursor-grab active:cursor-grabbing'
                    : 'cursor-pointer',
                  isActive
                    ? 'brightness-110 ring-2 ring-white/60 shadow-lg'
                    : 'hover:brightness-110',
                  'transition-[filter,box-shadow]',
                ].join(' ')}
                style={{ background: c.bg }}
                onPointerDown={token
                  ? e2 => { e2.stopPropagation(); onBarPointerDown(e2, t, 'move') }
                  : undefined}
                onClick={!token ? () => onBarClick(t) : undefined}
                title={`${t.module} — ${stage}\n${fmtDate(s)} → ${fmtDate(e)}`}
              >
                {width > 4 && (
                  <span
                    className="text-[10px] font-mono truncate whitespace-nowrap leading-none"
                    style={{ color: c.text }}
                  >
                    {stage}
                  </span>
                )}
              </div>

              {/* Right-edge resize handle */}
              {token && (
                <div
                  className="w-2 flex-shrink-0 rounded-r cursor-col-resize hover:brightness-125 active:brightness-150 transition-[filter]"
                  style={{
                    background: c.bg,
                    borderLeft: '1px solid rgba(255,255,255,0.25)',
                  }}
                  onPointerDown={e2 => { e2.stopPropagation(); onBarPointerDown(e2, t, 'resize') }}
                  title="Drag to resize end date"
                />
              )}
            </div>
          )
        })}

        {/* Today line */}
        {new Date() >= timeStart && new Date() <= timeEnd && (
          <div
            className="absolute top-0 bottom-0 w-px bg-brand z-10 pointer-events-none"
            style={{ left: `${pct(new Date())}%` }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Edit / Detail Panel ─────────────────────────────────────────────────────
function DetailPanel({ task, localEdits, onClose, onSave, token, vsMap, saving }) {
  const saved = localEdits[task.id] || {}
  const [editStart, setEditStart] = useState(dateToInputVal(saved.start ?? task.start))
  const [editEnd,   setEditEnd]   = useState(dateToInputVal(saved.end   ?? task.end))
  const [editStage, setEditStage] = useState(saved.stage ?? task.stage)

  // Sync if external drag updated this task while panel is open
  useEffect(() => {
    const s = localEdits[task.id]
    if (s?.start) setEditStart(dateToInputVal(s.start))
    if (s?.end)   setEditEnd(dateToInputVal(s.end))
    if (s?.stage) setEditStage(s.stage)
  }, [localEdits, task.id])

  const handleSave = () => {
    const newStart = inputValToDate(editStart)
    const newEnd   = inputValToDate(editEnd)
    if (!newStart || !newEnd || newEnd < newStart) return
    onSave(task, { start: newStart, end: newEnd, stage: editStage })
  }

  return (
    <div className="w-72 flex-shrink-0 border-l border-gray-200 dark:border-surface-600 bg-gray-50 dark:bg-surface-800 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-surface-600 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {task.module}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Phase {task.phase}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-surface-700 transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Fields */}
      <div className="p-4 space-y-4 flex-1">
        {/* Stage */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Stage</label>
          {token ? (
            <select
              value={editStage}
              onChange={e => setEditStage(e.target.value)}
              className="w-full text-xs font-mono bg-white dark:bg-surface-700 border border-gray-200 dark:border-surface-500 rounded px-2 py-1.5 text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              {WATCHTOWER_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <StatusChip status={task.stage} />
          )}
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Start Date</label>
          {token ? (
            <input
              type="date"
              value={editStart}
              onChange={e => setEditStart(e.target.value)}
              className="w-full text-xs font-mono bg-white dark:bg-surface-700 border border-gray-200 dark:border-surface-500 rounded px-2 py-1.5 text-gray-700 dark:text-gray-300 cursor-pointer"
            />
          ) : (
            <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
              {fmtDate(task.start)}
            </span>
          )}
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">End Date</label>
          {token ? (
            <input
              type="date"
              value={editEnd}
              onChange={e => setEditEnd(e.target.value)}
              className="w-full text-xs font-mono bg-white dark:bg-surface-700 border border-gray-200 dark:border-surface-500 rounded px-2 py-1.5 text-gray-700 dark:text-gray-300 cursor-pointer"
            />
          ) : (
            <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
              {fmtDate(task.end)}
            </span>
          )}
        </div>

        {/* Metadata from VS Input */}
        {vsMap[task.module] && (
          <div className="pt-3 border-t border-gray-100 dark:border-surface-600/50 space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Priority</span>
              <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                {vsMap[task.module]['Priority'] || '—'}
              </span>
            </div>
            {vsMap[task.module]['VS Notes'] && (
              <div>
                <p className="text-xs text-gray-400 mb-1">VS Notes</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {vsMap[task.module]['VS Notes']}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save button */}
      {token && (
        <div className="p-4 border-t border-gray-200 dark:border-surface-600">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-display font-semibold bg-brand text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Save size={12} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GanttView({ data, token, save, onToast }) {
  const [phaseFilter, setPhaseFilter] = useState('All')
  const [zoom, setZoom]               = useState('Month')
  const [selected, setSelected]       = useState(null)
  const [localEdits, setLocalEdits]   = useState({})  // { [taskId]: { start, end, stage } }
  const [rowOrder, setRowOrder]       = useState([])   // module names in display order
  const [saving, setSaving]           = useState(false)

  // Bar drag state — use ref for stable callbacks + state for re-render
  const dragRef        = useRef(null)   // { task, type, startX, origStart, origEnd, timelineWidth, moved }
  const dragPreviewRef = useRef(null)   // mirrors dragPreview state — safe to read inside event handlers
  const [activeBarId, setActiveBarId]   = useState(null)
  const [dragPreview, setDragPreview]   = useState(null)

  const timelineScrollRef = useRef(null)  // outer scroll container
  const timelineBodyRef   = useRef(null)  // inner content div

  // ─── Data ──────────────────────────────────────────────────────────────────
  const phaseGantt     = data[SHEET_NAMES.PHASE_GANTT] || []
  const watchtowerRows = data[SHEET_NAMES.WATCHTOWER]  || []
  const vsInput        = data[SHEET_NAMES.VS_INPUT]    || []

  const vsMap = useMemo(() => {
    const m = {}
    vsInput.forEach(r => { if (r['Module']) m[r['Module']] = r })
    return m
  }, [vsInput])

  // Column map for Watchtower Roadmap — used for all writes
  const watchtowerColMap = useMemo(() => {
    if (!watchtowerRows.length) return {}
    const m = {}
    Object.keys(watchtowerRows[0]).forEach((k, i) => { m[k] = colLetter(i) })
    return m
  }, [watchtowerRows])

  // Watchtower rows grouped by module (with original index for range writes)
  const watchtowerByModule = useMemo(() => {
    const m = {}
    watchtowerRows.forEach((r, i) => {
      const mod = r['Module']
      if (!mod) return
      if (!m[mod]) m[mod] = []
      m[mod].push({ ...r, _idx: i })
    })
    return m
  }, [watchtowerRows])

  const tasks = useMemo(() =>
    phaseGantt
      .map((r, i) => {
        if (!r['Module Name'] || !r['Start Date'] || !r['End Date']) return null
        const start = parseDateStr(r['Start Date'])
        const end   = parseDateStr(r['End Date'])
        if (!start || !end || end < start) return null
        return {
          id: i,
          _sheetIdx: i,
          module: r['Module Name'],
          stage:  r['Module Stage'],
          phase:  r['Phase'],
          start,
          end,
        }
      })
      .filter(Boolean),
    [phaseGantt]
  )

  const phases = useMemo(() =>
    [...new Set(tasks.map(t => t.phase).filter(Boolean))].sort(),
    [tasks]
  )

  const filtered = useMemo(() =>
    phaseFilter === 'All' ? tasks : tasks.filter(t => t.phase === phaseFilter),
    [tasks, phaseFilter]
  )

  const moduleGroups = useMemo(() => {
    const map = new Map()
    filtered.forEach(t => {
      if (!map.has(t.module)) map.set(t.module, [])
      map.get(t.module).push(t)
    })
    return [...map.entries()]
  }, [filtered])

  // Reset row order when filter changes
  useEffect(() => {
    setRowOrder(moduleGroups.map(([m]) => m))
  }, [phaseFilter, filtered.length])

  const orderedGroups = useMemo(() => {
    if (!rowOrder.length) return moduleGroups
    const map = new Map(moduleGroups)
    return rowOrder
      .map(m => [m, map.get(m)])
      .filter(([, tasks]) => tasks?.length)
  }, [moduleGroups, rowOrder])

  // Timeline bounds
  const { timeStart, timeEnd, months, totalMs } = useMemo(() => {
    if (!filtered.length) {
      const now = new Date()
      return { timeStart: now, timeEnd: now, months: [], totalMs: 1 }
    }
    const tStart = new Date(Math.min(...filtered.map(t => t.start)))
    const tEnd   = new Date(Math.max(...filtered.map(t => t.end)))
    tStart.setDate(1)
    tEnd.setMonth(tEnd.getMonth() + 1, 0)
    const totalMs = (tEnd - tStart) || 1
    return { timeStart: tStart, timeEnd: tEnd, months: getMonthsBetween(tStart, tEnd), totalMs }
  }, [filtered])

  const pct = useCallback(
    date => ((date - timeStart) / totalMs) * 100,
    [timeStart, totalMs]
  )

  // ─── Scroll to today on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!timelineScrollRef.current || !filtered.length) return
    const today = new Date()
    if (today < timeStart || today > timeEnd) return
    const fraction = (today - timeStart) / totalMs
    requestAnimationFrame(() => {
      if (!timelineScrollRef.current) return
      const sw = timelineScrollRef.current.scrollWidth
      timelineScrollRef.current.scrollLeft = fraction * sw - 320
    })
  }, [filtered.length, timeStart.getTime?.() ?? 0]) // eslint-disable-line

  const scrollToToday = () => {
    if (!timelineScrollRef.current) return
    const today = new Date()
    const fraction = Math.max(0, Math.min(1, (today - timeStart) / totalMs))
    const sw = timelineScrollRef.current.scrollWidth
    timelineScrollRef.current.scrollLeft = fraction * sw - 320
  }

  // ─── Row reorder (dnd-kit) ──────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const handleRowDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    setRowOrder(prev => {
      const oldIdx = prev.indexOf(active.id)
      const newIdx = prev.indexOf(over.id)
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  // ─── Bar drag / resize (raw pointer events) ─────────────────────────────────
  const onBarPointerDown = useCallback((e, task, type) => {
    if (!token) return
    e.preventDefault()

    const timelineWidth =
      (timelineScrollRef.current?.scrollWidth ?? LABEL_W + 900) - LABEL_W

    dragRef.current = {
      task,
      type,
      startX: e.clientX,
      origStart: new Date(task.start),
      origEnd:   new Date(task.end),
      timelineWidth,
      moved: false,
    }
    setActiveBarId(task.id)
    setDragPreview(null)
  }, [token])

  // Global pointer move
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current
      if (!d) return

      const deltaX = e.clientX - d.startX
      if (!d.moved && Math.abs(deltaX) < 3) return
      dragRef.current.moved = true

      const DAY_MS = 86_400_000
      const deltaDays = Math.round((deltaX / d.timelineWidth) * totalMs / DAY_MS)
      const deltaMs   = deltaDays * DAY_MS

      if (d.type === 'move') {
        const preview = {
          start: new Date(d.origStart.getTime() + deltaMs),
          end:   new Date(d.origEnd.getTime()   + deltaMs),
        }
        dragPreviewRef.current = preview
        setDragPreview(preview)
      } else {
        const newEnd = new Date(d.origEnd.getTime() + deltaMs)
        if (newEnd > d.origStart) {
          const preview = { start: d.origStart, end: newEnd }
          dragPreviewRef.current = preview
          setDragPreview(preview)
        }
      }
    }

    const onUp = () => {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null
      setActiveBarId(null)

      if (!d.moved) {
        // click → open panel
        setSelected(d.task)
        setDragPreview(null)
        return
      }

      const prev = dragPreviewRef.current
      dragPreviewRef.current = null
      setDragPreview(null)

      if (prev) {
        const { task, type } = d
        const updates = []
        const modRows = watchtowerByModule[task.module] || []

        const startField = STAGE_START_FIELD[task.stage]
        const endField   = STAGE_END_FIELD[task.stage]

        modRows.forEach(r => {
          const sheetRow = r._idx + 2
          if (type === 'move' && startField && watchtowerColMap[startField]) {
            updates.push({
              range:  `${SHEET_NAMES.WATCHTOWER}!${watchtowerColMap[startField]}${sheetRow}`,
              values: [[dateToStr(prev.start)]],
            })
          }
          if (endField && watchtowerColMap[endField]) {
            updates.push({
              range:  `${SHEET_NAMES.WATCHTOWER}!${watchtowerColMap[endField]}${sheetRow}`,
              values: [[dateToStr(prev.end)]],
            })
          }
        })

        setLocalEdits(le => ({
          ...le,
          [task.id]: {
            ...(le[task.id] || {}),
            start: type === 'move' ? prev.start : task.start,
            end:   prev.end,
          },
        }))

        if (updates.length) {
          save(updates)
          onToast?.('Dates updated', 'success')
        }
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }
  }, [totalMs, watchtowerColMap, watchtowerByModule, save, onToast])

  // ─── Panel save ────────────────────────────────────────────────────────────
  const handlePanelSave = useCallback(async (task, { start, end, stage }) => {
    if (!token) return
    setSaving(true)
    const updates  = []
    const modRows  = watchtowerByModule[task.module] || []
    const startField = STAGE_START_FIELD[stage]
    const endField   = STAGE_END_FIELD[stage]
    const stageCol   = watchtowerColMap['Stage - L3 Lifecycle']

    modRows.forEach(r => {
      const sheetRow = r._idx + 2
      if (startField && watchtowerColMap[startField]) {
        updates.push({
          range:  `${SHEET_NAMES.WATCHTOWER}!${watchtowerColMap[startField]}${sheetRow}`,
          values: [[dateToStr(start)]],
        })
      }
      if (endField && watchtowerColMap[endField]) {
        updates.push({
          range:  `${SHEET_NAMES.WATCHTOWER}!${watchtowerColMap[endField]}${sheetRow}`,
          values: [[dateToStr(end)]],
        })
      }
      if (stageCol) {
        updates.push({
          range:  `${SHEET_NAMES.WATCHTOWER}!${stageCol}${sheetRow}`,
          values: [[stage]],
        })
      }
    })

    setLocalEdits(le => ({ ...le, [task.id]: { start, end, stage } }))
    if (updates.length) await save(updates)
    setSaving(false)
    onToast?.('Changes saved', 'success')
  }, [token, watchtowerColMap, watchtowerByModule, save, onToast])

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b bg-white dark:bg-surface-800 border-gray-200 dark:border-surface-600 flex-shrink-0">
          <h2 className="font-display text-sm font-semibold text-gray-800 dark:text-gray-200 mr-1">
            Gantt Chart
          </h2>

          {/* Today button */}
          <button
            onClick={scrollToToday}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-gray-500 hover:text-brand border border-gray-200 dark:border-surface-500 rounded-lg cursor-pointer hover:border-brand/50 transition-colors"
          >
            <Target size={11} />
            Today
          </button>

          {/* Zoom segmented control */}
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-surface-700 rounded-lg p-0.5">
            {['Month', 'Quarter'].map(z => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={[
                  'px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer',
                  zoom === z
                    ? 'bg-white dark:bg-surface-600 shadow-sm text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                ].join(' ')}
              >
                {z}
              </button>
            ))}
          </div>

          {/* Phase filter */}
          <div className="ml-auto flex items-center gap-1.5">
            <Filter size={12} className="text-gray-400" />
            <select
              value={phaseFilter}
              onChange={e => setPhaseFilter(e.target.value)}
              className="text-xs font-mono bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded px-2 py-1 text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              <option value="All">All</option>
              {phases.map(p => <option key={p} value={p}>Phase {p}</option>)}
            </select>
          </div>

          {/* Edit mode hint */}
          {token && (
            <span className="text-[10px] font-mono text-gray-400 hidden lg:flex items-center gap-1 ml-1">
              <GripVertical size={10} /> reorder &nbsp;·&nbsp; drag bars to shift &nbsp;·&nbsp; drag edge to resize
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 px-5 py-2 border-b border-gray-100 dark:border-surface-600/50 flex-wrap flex-shrink-0 bg-white dark:bg-surface-800">
          {Object.entries(STAGE_COLORS).map(([stage, { bg }]) => (
            <div key={stage} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: bg }} />
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {stage}
              </span>
            </div>
          ))}
        </div>

        {/* Gantt body */}
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center flex-1 text-gray-500 text-sm">
            {phaseGantt.length === 0 ? 'Loading…' : 'No data for selected filters'}
          </div>
        ) : (
          <div className="flex-1 overflow-auto" ref={timelineScrollRef}>
            <div style={{ minWidth: LABEL_W + 900 }} ref={timelineBodyRef}>

              {/* Sticky header */}
              <div className="flex sticky top-0 z-20 bg-gray-100 dark:bg-surface-900 border-b border-gray-200 dark:border-surface-600">
                <div
                  style={{ width: LABEL_W, minWidth: LABEL_W }}
                  className="text-xs font-mono text-gray-500 px-3 py-2 border-r border-gray-200 dark:border-surface-600 flex-shrink-0"
                >
                  Module
                </div>
                <div className="flex-1 relative" style={{ height: 32 }}>
                  {zoom === 'Month'
                    ? months.map((m, i) => (
                        <div
                          key={i}
                          className="absolute text-xs font-mono text-gray-400 text-center border-r border-gray-200 dark:border-surface-700 overflow-hidden"
                          style={{
                            left:       `${pct(m)}%`,
                            width:      `${pct(new Date(m.getFullYear(), m.getMonth() + 1, 1)) - pct(m)}%`,
                            top: 0, bottom: 0, lineHeight: '32px',
                          }}
                        >
                          {m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                        </div>
                      ))
                    : (() => {
                        const quarters = []
                        months.forEach(m => {
                          const key  = `Q${Math.floor(m.getMonth() / 3) + 1} ${m.getFullYear()}`
                          const last = quarters[quarters.length - 1]
                          if (last?.key === key) last.end = new Date(m.getFullYear(), m.getMonth() + 1, 1)
                          else quarters.push({ key, start: m, end: new Date(m.getFullYear(), m.getMonth() + 1, 1) })
                        })
                        return quarters.map((q, i) => (
                          <div
                            key={i}
                            className="absolute text-xs font-mono text-gray-400 text-center border-r border-gray-200 dark:border-surface-700"
                            style={{
                              left:  `${pct(q.start)}%`,
                              width: `${pct(q.end) - pct(q.start)}%`,
                              top: 0, bottom: 0, lineHeight: '32px',
                            }}
                          >
                            {q.key}
                          </div>
                        ))
                      })()
                  }
                  {new Date() >= timeStart && new Date() <= timeEnd && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-brand/60 z-10"
                      style={{ left: `${pct(new Date())}%` }}
                    />
                  )}
                </div>
              </div>

              {/* Rows */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleRowDragEnd}
              >
                <SortableContext items={rowOrder} strategy={verticalListSortingStrategy}>
                  {orderedGroups.map(([module, moduleTasks]) => (
                    <SortableRow
                      key={module}
                      id={module}
                      module={module}
                      moduleTasks={moduleTasks}
                      months={months}
                      pct={pct}
                      timeStart={timeStart}
                      timeEnd={timeEnd}
                      token={token}
                      onBarPointerDown={onBarPointerDown}
                      onBarClick={setSelected}
                      localEdits={localEdits}
                      activeBarId={activeBarId}
                      dragPreview={dragPreview}
                    />
                  ))}
                </SortableContext>
              </DndContext>

            </div>
          </div>
        )}
      </div>

      {/* Detail / Edit panel */}
      {selected && (
        <DetailPanel
          task={selected}
          localEdits={localEdits}
          onClose={() => setSelected(null)}
          onSave={handlePanelSave}
          token={token}
          vsMap={vsMap}
          saving={saving}
        />
      )}
    </div>
  )
}