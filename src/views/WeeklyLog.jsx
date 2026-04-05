import { useState, useMemo, useEffect } from 'react'
import Modal from '../components/ui/Modal.jsx'
import StatusChip from '../components/ui/StatusChip.jsx'
import { formatDate, SHEET_NAMES } from '../config.js'
import { Plus, ChevronDown, ChevronUp, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Milestone serialisation ──────────────────────────────────────────────────
function parseMilestones(text) {
  if (!text) return []
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    let status = 'pending', content = line
    if (line.startsWith('✅')) { status = 'completed'; content = line.slice(1).trim() }
    else if (line.startsWith('⚠️')) { status = 'delayed'; content = line.slice(2).trim() }
    else if (line.startsWith('🔴')) { status = 'overdue'; content = line.slice(2).trim() }
    else if (line.startsWith('○')) { status = 'pending'; content = line.slice(1).trim() }
    const revMatch = content.match(/^(.+?)\s*→\s*~~(.+?)~~:\s*(.+)$/)
    if (revMatch) return { status, newDate: revMatch[1].trim(), oldDate: revMatch[2].trim(), label: revMatch[3].trim(), revised: true }
    const dateMatch = content.match(/^(.+?):\s*(.+)$/)
    if (dateMatch) return { status, date: dateMatch[1].trim(), label: dateMatch[2].trim() }
    return { status, label: content }
  })
}

function serializeMilestones(milestones) {
  return milestones.map(m => {
    const prefix = m.status === 'completed' ? '✅' : m.status === 'delayed' ? '⚠️' : '○'
    if (m.revised && m.oldDate) return `${prefix} ${m.newDate} → ~~${m.oldDate}~~: ${m.label}`
    return `${prefix} ${m.date || ''}: ${m.label}`.replace(/: $/, '')
  }).join('\n')
}

function slippageCount(label, allRows, module) {
  let count = 0
  allRows.filter(r => r['Module'] === module).forEach(row => {
    parseMilestones(row['Weekly Status of Module']).forEach(m => { if (m.label === label && m.revised) count++ })
  })
  return count
}

// ─── Milestone row ────────────────────────────────────────────────────────────
function MilestoneRow({ m, count }) {
  const icons = { completed: '✅', delayed: '⚠️', overdue: '🔴', pending: '○' }
  const textColors = { completed: 'text-gray-500 line-through', delayed: 'text-amber-400', overdue: 'text-red-400', pending: 'text-gray-700 dark:text-gray-300' }
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-sm flex-shrink-0 mt-0.5">{icons[m.status]}</span>
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-body ${textColors[m.status]}`}>
          {m.revised ? (
            <><strong className="text-gray-800 dark:text-gray-200">{m.newDate}</strong>{' → '}<span className="line-through">{m.oldDate}</span>{': '}{m.label}</>
          ) : (
            <>{m.date && <strong>{m.date}</strong>}{m.date ? ': ' : ''}{m.label}</>
          )}
        </span>
        {count > 1 && <span className="ml-2 text-xs bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded font-mono">slipped ×{count}</span>}
      </div>
    </div>
  )
}

// ─── Module card ─────────────────────────────────────────────────────────────
function ModuleCard({ row, allRows, isCurrentWeek, token, onEdit, isNotUpdated }) {
  const [expanded, setExpanded] = useState(false)
  const milestones = parseMilestones(row['Weekly Status of Module'])
  const overdueCount = milestones.filter(m => m.status === 'overdue').length

  return (
    <div className={`rounded-xl border p-4 transition-all duration-150 ${isNotUpdated ? 'border-red-500/40 bg-red-900/5' : 'border-gray-200 dark:border-surface-500 bg-white dark:bg-surface-700'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display text-sm font-semibold text-gray-900 dark:text-gray-200">{row['Module']}</span>
          <StatusChip status={row['Status']} size="xs" />
          {isNotUpdated && <span className="flex items-center gap-1 text-xs text-red-400 bg-red-900/20 px-2 py-0.5 rounded-full"><AlertTriangle size={10} /> Not Updated</span>}
          {overdueCount > 0 && <span className="flex items-center gap-1 text-xs text-red-400">🔴 {overdueCount} overdue</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {token && isCurrentWeek && (
            <>
              {isNotUpdated
                ? <button onClick={() => onEdit(row)} className="px-2.5 py-1 text-xs bg-red-500 text-white rounded-lg font-body hover:bg-red-600 cursor-pointer">Update Now</button>
                : <button onClick={() => onEdit(row)} className="px-2.5 py-1 text-xs text-gray-400 border border-gray-300 dark:border-surface-400 rounded-lg font-body hover:text-gray-200 cursor-pointer">Edit</button>
              }
            </>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-gray-200 cursor-pointer">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <div className={`border-l-2 pl-3 ${isNotUpdated ? 'border-red-500/40' : 'border-gray-200 dark:border-surface-500'}`}>
        {milestones.slice(0, expanded ? undefined : 3).map((m, i) => (
          <MilestoneRow key={i} m={m} count={m.label ? slippageCount(m.label, allRows, row['Module']) : 0} />
        ))}
        {!expanded && milestones.length > 3 && (
          <button onClick={() => setExpanded(true)} className="text-xs text-gray-500 hover:text-brand cursor-pointer mt-1">+{milestones.length - 3} more…</button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-surface-500/30">
          <p className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">History</p>
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {allRows.filter(r => r['Module'] === row['Module']).slice(-8).map((r, i, arr) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center min-w-12">
                  <span className="text-xs font-mono text-gray-500">{r['Week Number']}</span>
                  <div className={`w-3 h-3 rounded-full my-1 ${r['Status'] === 'Done' ? 'bg-emerald-400' : r['Status'] === 'Open' ? 'bg-gray-500' : 'bg-brand'}`} />
                  <span className={`text-xs font-mono ${r['Status'] === 'Done' ? 'text-emerald-400' : 'text-gray-500'}`}>{r['Status'] === 'Done' ? '✓' : r['Status'] === 'Open' ? '—' : '●'}</span>
                </div>
                {i < arr.length - 1 && <div className="w-5 h-px bg-gray-200 dark:bg-surface-500 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-400 dark:text-gray-600 font-mono">Update due: {formatDate(row['Update Due On'])}</div>
    </div>
  )
}

// ─── Edit modal ───────────────────────────────────────────────────────────────
function EditModal({ editRow, allRows, selectedWeek, onClose, save, onToast }) {
  const [editStatus, setEditStatus] = useState(editRow['Status'] || 'Ongoing')
  const [editMilestones, setEditMilestones] = useState(
    () => parseMilestones(editRow['Weekly Status of Module'])
  )

  const updateMilestone = (i, field, value) =>
    setEditMilestones(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))

  const handleSave = () => {
    const rowIdx = allRows.indexOf(editRow)
    if (rowIdx < 0) { onToast('Row not found', 'error'); return }
    const sheetRow = rowIdx + 2  // +1 for header, +1 for 1-indexed
    // Spec columns: C=Weekly Status (milestones text), D=Update Due On, E=Status
    save([
      { range: `${SHEET_NAMES.WEEKLY_UPDATE}!C${sheetRow}`, values: [[serializeMilestones(editMilestones)]] },
      { range: `${SHEET_NAMES.WEEKLY_UPDATE}!E${sheetRow}`, values: [[editStatus]] },
    ])
    onToast('Update saved', 'success')
    onClose()
  }

  return (
    <Modal title={`Edit — ${editRow['Module']} (${selectedWeek})`} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-mono text-gray-500 mb-2 block uppercase tracking-wider">Status</label>
          <div className="flex gap-2">
            {['Ongoing', 'Done', 'Open'].map(s => (
              <button key={s} onClick={() => setEditStatus(s)}
                className={`px-3 py-1.5 text-xs font-body rounded-lg border cursor-pointer transition-colors
                  ${editStatus === s ? 'bg-brand text-white border-brand' : 'border-gray-300 dark:border-surface-400 text-gray-400 hover:border-brand/50'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-gray-500 mb-2 block uppercase tracking-wider">Milestones</label>
          <div className="space-y-2 border border-gray-200 dark:border-surface-400 rounded-lg p-3">
            {editMilestones.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={m.status}
                  onChange={e => updateMilestone(i, 'status', e.target.value)}
                  className="text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded px-2 py-1 cursor-pointer text-gray-300"
                >
                  <option value="pending">○</option>
                  <option value="completed">✅</option>
                  <option value="delayed">⚠️</option>
                </select>
                <input
                  value={m.label}
                  onChange={e => updateMilestone(i, 'label', e.target.value)}
                  className="flex-1 px-2 py-1 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50"
                />
                <input
                  type="date"
                  value={m.revised ? m.newDate : (m.date || '')}
                  onChange={e => updateMilestone(i, m.revised ? 'newDate' : 'date', e.target.value)}
                  className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded text-gray-700 dark:text-gray-300 cursor-pointer"
                />
              </div>
            ))}
            <button
              onClick={() => setEditMilestones(prev => [...prev, { status: 'pending', date: '', label: '' }])}
              className="text-xs text-brand hover:underline cursor-pointer mt-1 flex items-center gap-1"
            >
              <Plus size={10} /> Add milestone
            </button>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">Cancel</button>
        <button onClick={handleSave} className="px-4 py-2 text-sm font-display font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer">
          Save to Sheet
        </button>
      </div>
    </Modal>
  )
}

// ─── Add Update modal ─────────────────────────────────────────────────────────
function AddUpdateModal({ currentWeek, onClose, append, onToast }) {
  const [module, setModule] = useState('')
  const [status, setStatus] = useState('Ongoing')

  const handleAdd = async () => {
    if (!module.trim()) { onToast('Module name required', 'error'); return }
    // Spec: A=Week Number, B=Module, C=Weekly Status (milestones), D=Update Due On, E=Status
    await append(SHEET_NAMES.WEEKLY_UPDATE, [[currentWeek, module.trim(), '', '', status]])
    onToast('Update added', 'success')
    onClose()
  }

  return (
    <Modal title="Add Module Update" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-mono text-gray-500 mb-1 block">Module</label>
          <input value={module} onChange={e => setModule(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50"
            placeholder="Module name" />
        </div>
        <div>
          <label className="text-xs font-mono text-gray-500 mb-1 block">Status</label>
          <div className="flex gap-2">
            {['Ongoing', 'Done', 'Open'].map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-xs font-body rounded-lg border cursor-pointer transition-colors
                  ${status === s ? 'bg-brand text-white border-brand' : 'border-gray-300 dark:border-surface-400 text-gray-400 hover:border-brand/50'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">Cancel</button>
        <button onClick={handleAdd} className="px-4 py-2 text-sm font-display font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer">Add</button>
      </div>
    </Modal>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WeeklyLog({ data, token, save, append, onToast }) {
  const [editRow, setEditRow] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const allRows = data[SHEET_NAMES.WEEKLY_UPDATE] || []

  const weeks = useMemo(() => {
    const wks = [...new Set(allRows.map(r => r['Week Number']).filter(Boolean))]
    return wks
  }, [allRows])

  const [selectedWeek, setSelectedWeek] = useState('')
  // Sync to latest week whenever weeks list changes (data loads async)
  useEffect(() => {
    if (weeks.length) setSelectedWeek(prev => prev && weeks.includes(prev) ? prev : weeks[weeks.length - 1])
  }, [weeks])
  const currentWeek = weeks[weeks.length - 1]
  const isCurrentWeek = selectedWeek === currentWeek
  const weekIdx = weeks.indexOf(selectedWeek)

  const weekRows = useMemo(() => allRows.filter(r => r['Week Number'] === selectedWeek), [allRows, selectedWeek])

  const currentModules = useMemo(() =>
    new Set(allRows.filter(r => r['Week Number'] === currentWeek).map(r => r['Module'])),
    [allRows, currentWeek]
  )

  const notUpdatedModules = useMemo(() => {
    if (!isCurrentWeek) return new Set()
    const prevWeek = weeks[weeks.length - 2]
    const prevModules = new Set(allRows.filter(r => r['Week Number'] === prevWeek).map(r => r['Module']))
    return new Set([...prevModules].filter(m => !currentModules.has(m)))
  }, [allRows, currentWeek, weeks, isCurrentWeek, currentModules])

  // STUB-1: Start New Week — clone non-Done rows with incremented week number
  const handleStartNewWeek = async () => {
    if (!token) return onToast('Sign in to start a new week', 'error')
    // Spec: Week Number = "Wk-" + WEEKNUM(date) — no zero padding (e.g. Wk-4 not Wk-04)
    const match = (currentWeek || '').match(/Wk-(\d+)/i) || (currentWeek || '').match(/W(\d+)/i)
    const nextNum = match ? Number(match[1]) + 1 : 1
    const nextWeek = `Wk-${nextNum}`
    const toCarry = allRows.filter(r => r['Week Number'] === currentWeek && r['Status'] !== 'Done')
    if (toCarry.length === 0) { onToast('No active modules to carry forward', 'error'); return }
    // Spec: A=Week Number, B=Module, C=Weekly Status (milestones), D=Update Due On, E=Status
    const newRows = toCarry.map(r => [nextWeek, r['Module'], r['Weekly Status of Module'] || '', '', 'Ongoing'])
    await append(SHEET_NAMES.WEEKLY_UPDATE, newRows)
    onToast(`${nextWeek} started — ${toCarry.length} modules carried forward`, 'success')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden font-body">
      {/* Week navigator — FRICTION-5 */}
      <div className="px-5 py-3 border-b bg-white dark:bg-surface-800 border-gray-200 dark:border-surface-600 flex-shrink-0 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-sm font-semibold text-gray-800 dark:text-gray-200">Weekly Log</h2>
          <div className="flex items-center gap-1 ml-auto">
            <button
              disabled={weekIdx <= 0}
              onClick={() => setSelectedWeek(weeks[weekIdx - 1])}
              aria-label="Previous week"
              className="p-1.5 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-surface-700 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className={`px-4 py-1.5 text-xs font-display font-semibold rounded-lg min-w-[120px] text-center
              ${isCurrentWeek ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-surface-600 text-gray-700 dark:text-gray-300'}`}>
              {selectedWeek} {isCurrentWeek && '(Current)'}
            </span>
            <button
              disabled={weekIdx >= weeks.length - 1}
              onClick={() => setSelectedWeek(weeks[weekIdx + 1])}
              aria-label="Next week"
              className="p-1.5 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-surface-700 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
            {!isCurrentWeek && (
              <button
                onClick={() => setSelectedWeek(currentWeek)}
                className="px-2 py-1 text-xs font-mono text-brand hover:underline cursor-pointer"
              >
                → Today
              </button>
            )}
            <span className="text-xs font-mono text-gray-400 ml-1">{weekIdx + 1}/{weeks.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-mono text-gray-500">{weekRows.length} modules</span>
          {notUpdatedModules.size > 0 && (
            <span className="text-xs font-mono text-red-400 flex items-center gap-1">
              <AlertTriangle size={10} /> {notUpdatedModules.size} not updated
            </span>
          )}
          {isCurrentWeek && token && (
            <button onClick={handleStartNewWeek}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors cursor-pointer ml-auto">
              <Plus size={13} /> Start New Week
            </button>
          )}
          {token && (
            <button onClick={() => setShowAdd(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-body border border-gray-300 dark:border-surface-400 text-gray-400 rounded-lg hover:text-gray-200 cursor-pointer ${isCurrentWeek ? '' : 'ml-auto'}`}>
              <Plus size={13} /> Add Update
            </button>
          )}
        </div>
      </div>

      {/* Module cards */}
      <div className="flex-1 overflow-y-auto p-5">
        {weekRows.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">No updates for this week</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {weekRows.map((row, i) => (
              <ModuleCard key={i} row={row} allRows={allRows} isCurrentWeek={isCurrentWeek}
                token={token} onEdit={setEditRow} isNotUpdated={notUpdatedModules.has(row['Module'])} />
            ))}
          </div>
        )}
      </div>

      {editRow && (
        <EditModal
          editRow={editRow}
          allRows={allRows}
          selectedWeek={selectedWeek}
          onClose={() => setEditRow(null)}
          save={save}
          onToast={onToast}
        />
      )}
      {showAdd && (
        <AddUpdateModal
          currentWeek={currentWeek}
          onClose={() => setShowAdd(false)}
          append={append}
          onToast={onToast}
        />
      )}
    </div>
  )
}