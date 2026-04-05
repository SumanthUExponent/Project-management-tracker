import { useState, useMemo } from 'react'
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import StatusChip from '../components/ui/StatusChip.jsx'
import Modal from '../components/ui/Modal.jsx'
import { isOverdue, daysFrom, SHEET_NAMES, dateToSerial, serialToDate } from '../config.js'
import { Plus, AlertTriangle, Clock } from 'lucide-react'

const COLUMNS = ['Open', 'In Progress', 'Stuck', 'Completed']
const PRIORITIES = ['Critical', 'High', 'Low']

function colLetter(idx) {
  if (idx < 0) return ''
  let result = '', n = idx + 1
  while (n > 0) { const rem = (n - 1) % 26; result = String.fromCharCode(65 + rem) + result; n = Math.floor((n - 1) / 26) }
  return result
}

function CAWCard({ item, onClick, isDragging }) {
  const days = daysFrom(item['ETA for Go-live'])
  const overdue = isOverdue(item['ETA for Go-live'])
  return (
    <div onClick={onClick}
      className={`bg-white dark:bg-surface-700 border rounded-lg p-3 cursor-pointer hover:border-brand/40 transition-all duration-150 group
        ${isDragging ? 'opacity-50 rotate-1' : ''}
        ${item['Status'] === 'Stuck' ? 'border-red-300 dark:border-red-500/40' : 'border-gray-200 dark:border-surface-500'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-body text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">{item['Current Area of Work']}</p>
        <StatusChip status={item['Priority']} size="xs" />
      </div>
      {item['Related Module'] && <div className="text-xs font-mono text-gray-500 mb-2">{item['Related Module']}</div>}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {item['EE Team'] && <span className="text-xs text-gray-500">{item['EE Team']}</span>}
        </div>
        {days !== null && (
          <div className={`flex items-center gap-1 text-xs font-mono ${overdue ? 'text-red-400' : days <= 3 ? 'text-amber-400' : 'text-gray-500'}`}>
            {overdue ? <AlertTriangle size={10} /> : <Clock size={10} />}
            {overdue ? `${Math.abs(days)}d over` : `${days}d`}
          </div>
        )}
      </div>
    </div>
  )
}

// FRICTION-6: show drop zones when dragging
function DroppableColumn({ id, label, items, onCardClick, dragActive }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="flex flex-col flex-shrink-0 flex-1 min-w-[82vw] sm:min-w-56 sm:max-w-xs snap-center sm:snap-align-none">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-display text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</h3>
        <span className="text-xs font-mono text-gray-600 bg-gray-100 dark:bg-surface-600 px-1.5 py-0.5 rounded">{items.length}</span>
      </div>
      <div ref={setNodeRef} className={`
        flex-1 rounded-xl p-2 space-y-2 min-h-24 transition-all duration-150
        ${isOver
          ? 'bg-brand/5 border-2 border-brand/40 border-dashed'
          : dragActive
          ? 'border-2 border-dashed border-gray-300 dark:border-surface-500 bg-gray-50 dark:bg-surface-700/30'
          : 'border-2 border-transparent bg-gray-50 dark:bg-surface-700/30'
        }
      `}>
        {items.map(item => (
          <DraggableCard key={item._idx} item={item} onCardClick={onCardClick} />
        ))}
      </div>
    </div>
  )
}

function DraggableCard({ item, onCardClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: String(item._idx) })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <CAWCard item={item} onClick={() => onCardClick(item)} isDragging={isDragging} />
    </div>
  )
}

export default function CAWBoard({ data, token, save, append, onToast }) {
  const [activeId, setActiveId] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [editValues, setEditValues] = useState({})   // controlled state for detail modal
  const [filterTeam, setFilterTeam] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ Priority: 'High', Status: 'Open' })

  const rows = useMemo(() => (data[SHEET_NAMES.CAW] || []).map((r, i) => ({ ...r, _idx: i })), [data])

  // Derive column letter map from header order (like GanttView/PBITracker)
  const colMap = useMemo(() => {
    if (!rows.length) return {}
    const keys = Object.keys(rows[0]).filter(k => k !== '_idx')
    const m = {}
    keys.forEach((k, i) => { m[k] = colLetter(i) })
    return m
  }, [rows])

  const statusCol = colMap['Status'] || 'G'

  const filtered = useMemo(() => rows.filter(r => {
    if (filterTeam && r['EE Team'] !== filterTeam) return false
    if (filterPriority && r['Priority'] !== filterPriority) return false
    return true
  }), [rows, filterTeam, filterPriority])

  const grouped = useMemo(() => {
    const g = {}
    COLUMNS.forEach(c => { g[c] = [] })
    filtered.forEach(r => { const col = COLUMNS.includes(r['Status']) ? r['Status'] : 'Open'; g[col].push(r) })
    const order = { Critical: 0, High: 1, Low: 2 }
    COLUMNS.forEach(c => { g[c].sort((a, b) => (order[a['Priority']] ?? 3) - (order[b['Priority']] ?? 3)) })
    return g
  }, [filtered])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const teams = [...new Set(rows.map(r => r['EE Team']).filter(Boolean))].sort()

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || !token) return
    const item = rows.find(r => String(r._idx) === active.id)
    if (!item || item['Status'] === over.id) return
    save([{ range: `${SHEET_NAMES.CAW}!${statusCol}${item._idx + 2}`, values: [[over.id]] }])
  }

  // STUB-4: Add New Item
  const handleAddItem = async () => {
    if (!newItem['Current Area of Work']?.trim()) { onToast?.('Work item description required', 'error'); return }
    // Spec column order: A=Current Area of Work, B=Related Module, C=EE Team, D=EE SPOC,
    // E=League Member, F=Priority, G=Status, H=ETA for Go-live, I=Comments, J=Link
    await append(SHEET_NAMES.CAW, [[
      newItem['Current Area of Work'] || '',  // A
      newItem['Related Module'] || '',         // B
      newItem['EE Team'] || '',                // C
      newItem['EE SPOC'] || '',                // D
      '',                                      // E: League Member
      newItem['Priority'] || 'High',           // F
      'Open',                                  // G: Status
      newItem['ETA for Go-live'] ? dateToSerial(new Date(newItem['ETA for Go-live'])) : '',  // H: convert YYYY-MM-DD → DD/MM/YYYY
      '',                                      // I: Comments
      '',                                      // J: Link
    ]])
    onToast?.('Item added', 'success')
    setShowAdd(false)
    setNewItem({ Priority: 'High', Status: 'Open' })
  }

  // Convert DD/MM/YYYY → YYYY-MM-DD for <input type="date">
  const etaToInput = (val) => {
    const d = serialToDate(val)
    if (!d) return ''
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const openDetail = (item) => {
    setSelectedItem(item)
    setEditValues({
      'Current Area of Work': item['Current Area of Work'] || '',
      'Related Module':       item['Related Module'] || '',
      'EE Team':              item['EE Team'] || '',
      'EE SPOC':              item['EE SPOC'] || '',
      'League Member':        item['League Member'] || '',
      'Comments':             item['Comments'] || '',
      'Priority':             item['Priority'] || 'High',
      'Status':               item['Status'] || 'Open',
      'ETA for Go-live':      etaToInput(item['ETA for Go-live']),
    })
  }

  const handleDetailSave = () => {
    if (!selectedItem) return
    const sheetRow = selectedItem._idx + 2
    const updates = []
    const fields = [
      'Current Area of Work', 'Related Module', 'EE Team',
      'EE SPOC', 'Priority', 'ETA for Go-live', 'Status',
      'League Member', 'Comments',
    ]
    fields.forEach(f => {
      if (colMap[f] && editValues[f] !== undefined) {
        let value = editValues[f]
        // ETA stored as DD/MM/YYYY in sheet; editValues has YYYY-MM-DD from date input
        if (f === 'ETA for Go-live' && value) value = dateToSerial(new Date(value))
        updates.push({ range: `${SHEET_NAMES.CAW}!${colMap[f]}${sheetRow}`, values: [[value]] })
      }
    })
    if (updates.length) save(updates)
    onToast?.('CAW item saved', 'success')
    setSelectedItem(null)
  }

  const activeItem = activeId ? rows.find(r => String(r._idx) === activeId) : null

  return (
    <div className="flex flex-col h-full overflow-hidden font-body">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b bg-white dark:bg-surface-800 border-gray-200 dark:border-surface-600 flex items-center gap-3 flex-wrap flex-shrink-0">
        <h2 className="font-display text-sm font-semibold text-gray-800 dark:text-gray-200">CAW Board</h2>
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
          className="text-xs font-mono bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded px-2 py-1 text-gray-700 dark:text-gray-300 cursor-pointer">
          <option value="">All Teams</option>
          {teams.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="text-xs font-mono bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded px-2 py-1 text-gray-700 dark:text-gray-300 cursor-pointer">
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        {token && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors cursor-pointer ml-auto">
            <Plus size={13} /> New Item
          </button>
        )}
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-5 snap-x snap-mandatory sm:snap-none overscroll-x-contain">
        <DndContext sensors={sensors}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full sm:min-w-max">
            {COLUMNS.map(col => (
              <DroppableColumn key={col} id={col} label={col}
                items={grouped[col] || []}
                onCardClick={openDetail}
                dragActive={activeId !== null} />
            ))}
          </div>
          <DragOverlay>
            {activeItem ? <CAWCard item={activeItem} onClick={() => {}} isDragging={false} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <Modal title="CAW Item" onClose={() => setSelectedItem(null)} size="md">
          <div className="space-y-3">
            {[
              { label: 'Work Item', key: 'Current Area of Work' },
              { label: 'Related Module', key: 'Related Module' },
              { label: 'Team', key: 'EE Team' },
              { label: 'SPOC', key: 'EE SPOC' },
              { label: 'League Member', key: 'League Member' },
              { label: 'Comments', key: 'Comments' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 font-mono mb-1 block">{label}</label>
                <input
                  value={editValues[key] ?? ''}
                  onChange={e => setEditValues(p => ({ ...p, [key]: e.target.value }))}
                  disabled={!token}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50 disabled:opacity-60" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-mono mb-1 block">Priority</label>
                <select
                  value={editValues['Priority'] ?? 'High'}
                  onChange={e => setEditValues(p => ({ ...p, Priority: e.target.value }))}
                  disabled={!token}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 cursor-pointer disabled:opacity-60">
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-mono mb-1 block">Status</label>
                <select
                  value={editValues['Status'] ?? 'Open'}
                  onChange={e => setEditValues(p => ({ ...p, Status: e.target.value }))}
                  disabled={!token}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 cursor-pointer disabled:opacity-60">
                  {COLUMNS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-500 font-mono mb-1 block">ETA for Go-live</label>
            <input
              type="date"
              value={editValues['ETA for Go-live'] ?? ''}
              onChange={e => setEditValues(p => ({ ...p, 'ETA for Go-live': e.target.value }))}
              disabled={!token}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50 disabled:opacity-60 cursor-pointer" />
          </div>
          <div className="flex items-center gap-2 mt-5">
            <div className="ml-auto flex gap-2">
              <button onClick={() => setSelectedItem(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">Close</button>
              {token && <button onClick={handleDetailSave} className="px-4 py-2 text-sm font-display font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer">Save</button>}
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Item Modal — STUB-4 */}
      {showAdd && (
        <Modal title="New CAW Item" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Current Area of Work *</label>
              <input value={newItem['Current Area of Work'] || ''} onChange={e => setNewItem(p => ({ ...p, 'Current Area of Work': e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50"
                placeholder="Describe the work item" />
            </div>
            {['Related Module', 'EE Team', 'EE SPOC'].map(f => (
              <div key={f}>
                <label className="text-xs text-gray-500 font-mono mb-1 block">{f}</label>
                <input value={newItem[f] || ''} onChange={e => setNewItem(p => ({ ...p, [f]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-mono mb-1 block">Priority</label>
                <select value={newItem['Priority'] || 'High'} onChange={e => setNewItem(p => ({ ...p, Priority: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg cursor-pointer text-gray-800 dark:text-gray-200">
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-mono mb-1 block">ETA</label>
                <input type="date" value={newItem['ETA for Go-live'] || ''} onChange={e => setNewItem(p => ({ ...p, 'ETA for Go-live': e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg cursor-pointer text-gray-300" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">Cancel</button>
            <button onClick={handleAddItem}
              className="px-4 py-2 text-sm font-display font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer">
              Add Item
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}