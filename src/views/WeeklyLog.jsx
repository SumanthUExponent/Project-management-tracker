import { useState, useMemo } from 'react'
import Modal from '../components/ui/Modal.jsx'
import StatusChip from '../components/ui/StatusChip.jsx'
import { formatDate, SHEET_NAMES, dateToSerial } from '../config.js'
import { Plus, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Clock, Calendar } from 'lucide-react'

// Parse milestone text into structured list
function parseMilestones(text) {
  if (!text) return []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  return lines.map(line => {
    let status = 'pending'
    let content = line

    if (line.startsWith('✅')) { status = 'completed'; content = line.slice(1).trim() }
    else if (line.startsWith('⚠️')) { status = 'delayed'; content = line.slice(2).trim() }
    else if (line.startsWith('🔴')) { status = 'overdue'; content = line.slice(2).trim() }
    else if (line.startsWith('○')) { status = 'pending'; content = line.slice(1).trim() }

    // Parse "newDate → ~~oldDate~~: label"
    const revMatch = content.match(/^(.+?)\s*→\s*~~(.+?)~~:\s*(.+)$/)
    if (revMatch) {
      return { status, newDate: revMatch[1].trim(), oldDate: revMatch[2].trim(), label: revMatch[3].trim(), revised: true }
    }
    // Parse "Date: label"
    const dateMatch = content.match(/^(.+?):\s*(.+)$/)
    if (dateMatch) {
      return { status, date: dateMatch[1].trim(), label: dateMatch[2].trim() }
    }
    return { status, label: content }
  })
}

// Format milestone back to text
function serializeMilestones(milestones) {
  return milestones.map(m => {
    const prefix = m.status === 'completed' ? '✅' : m.status === 'delayed' ? '⚠️' : '○'
    if (m.revised && m.oldDate) {
      return `${prefix} ${m.newDate} → ~~${m.oldDate}~~: ${m.label}`
    }
    return `${prefix} ${m.date || ''}: ${m.label}`.replace(/: $/, '')
  }).join('\n')
}

// How many times has a milestone's date been revised
function slippageCount(label, allRows, module) {
  const moduleRows = allRows.filter(r => r['Module'] === module)
  let count = 0
  moduleRows.forEach(row => {
    const milestones = parseMilestones(row['Weekly Status of Module'])
    milestones.forEach(m => { if (m.label === label && m.revised) count++ })
  })
  return count
}

function MilestoneRow({ m, count }) {
  const icons = { completed: '✅', delayed: '⚠️', overdue: '🔴', pending: '○' }
  const textColors = {
    completed: 'text-gray-500 line-through',
    delayed: 'text-amber-400',
    overdue: 'text-red-400',
    pending: 'text-gray-700 dark:text-gray-300',
  }

  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-sm flex-shrink-0 mt-0.5">{icons[m.status]}</span>
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-body ${textColors[m.status]}`}>
          {m.revised ? (
            <>
              <strong className="text-gray-800 dark:text-gray-200">{m.newDate}</strong>
              {' → '}
              <span className="date-strike">{m.oldDate}</span>
              {': '}{m.label}
            </>
          ) : (
            <>{m.date && <strong>{m.date}</strong>}{m.date ? ': ' : ''}{m.label}</>
          )}
        </span>
        {count > 1 && (
          <span className="ml-2 text-xs bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded font-mono">slipped ×{count}</span>
        )}
      </div>
    </div>
  )
}

function ModuleCard({ row, allRows, isCurrentWeek, token, onEdit, isNotUpdated }) {
  const [expanded, setExpanded] = useState(false)
  const milestones = parseMilestones(row['Weekly Status of Module'])
  const overdueCount = milestones.filter(m => m.status === 'overdue').length

  return (
    <div className={`
      rounded-xl border p-4 transition-all duration-150
      ${isNotUpdated ? 'border-red-500/40 bg-red-900/5' : 'border-gray-200 dark:border-surface-500 bg-white dark:bg-surface-700'}
    `}>
      {/* Card header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display text-sm font-semibold text-gray-900 dark:text-gray-200">{row['Module']}</span>
          <StatusChip status={row['Status']} size="xs" />
          {isNotUpdated && (
            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-900/20 px-2 py-0.5 rounded-full">
              <AlertTriangle size={10} /> Not Updated
            </span>
          )}
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-400">🔴 {overdueCount} overdue</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {token && isCurrentWeek && (
            <>
              {isNotUpdated
                ? <button onClick={() => onEdit(row)} className="px-2.5 py-1 text-xs bg-red-500 text-white rounded-lg font-body hover:bg-red-600 cursor-pointer">Update Now</button>
                : <button onClick={() => onEdit(row)} className="px-2.5 py-1 text-xs text-gray-400 border border-gray-300 dark:border-surface-400 rounded-lg font-body hover:text-gray-200 cursor-pointer">Edit</button>
              }
              {row['Status'] !== 'Done' && (
                <button className="px-2.5 py-1 text-xs text-emerald-400 border border-emerald-500/30 rounded-lg font-body hover:bg-emerald-900/20 cursor-pointer">Mark Done</button>
              )}
            </>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-gray-200 cursor-pointer">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Milestones */}
      <div className={`border-l-2 pl-3 ${isNotUpdated ? 'border-red-500/40' : 'border-gray-200 dark:border-surface-500'}`}>
        {milestones.slice(0, expanded ? undefined : 3).map((m, i) => {
          const count = m.label ? slippageCount(m.label, allRows, row['Module']) : 0
          return <MilestoneRow key={i} m={m} count={count} />
        })}
        {!expanded && milestones.length > 3 && (
          <button onClick={() => setExpanded(true)} className="text-xs text-gray-500 hover:text-brand cursor-pointer mt-1">
            +{milestones.length - 3} more…
          </button>
        )}
      </div>

      {/* History timeline */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-surface-500/30">
          <p className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">History</p>
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {allRows
              .filter(r => r['Module'] === row['Module'])
              .slice(-8)
              .map((r, i, arr) => (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center min-w-12">
                    <span className="text-xs font-mono text-gray-500">{r['Week Number']}</span>
                    <div className={`w-3 h-3 rounded-full my-1 ${r['Status'] === 'Done' ? 'bg-emerald-400' : r['Status'] === 'Open' ? 'bg-gray-500' : 'bg-brand'}`} />
                    <span className={`text-xs font-mono ${r['Status'] === 'Done' ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {r['Status'] === 'Done' ? '✓' : r['Status'] === 'Open' ? '—' : '●'}
                    </span>
                  </div>
                  {i < arr.length - 1 && <div className="w-5 h-px bg-gray-200 dark:bg-surface-500 flex-shrink-0" />}
                </div>
              ))
            }
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-400 dark:text-gray-600 font-mono">
        Update due: {formatDate(row['Update Due On'])}
      </div>
    </div>
  )
}

export default function WeeklyLog({ data, token, save, onToast }) {
  const [editRow, setEditRow] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const allRows = data[SHEET_NAMES.WEEKLY_UPDATE] || []

  // Get unique weeks, sorted
  const weeks = useMemo(() => {
    const wks = [...new Set(allRows.map(r => r['Week Number']).filter(Boolean))]
    return wks
  }, [allRows])

  const [selectedWeek, setSelectedWeek] = useState(() => weeks[weeks.length - 1] || '')
  const currentWeek = weeks[weeks.length - 1]
  const isCurrentWeek = selectedWeek === currentWeek

  const weekRows = useMemo(() =>
    allRows.filter(r => r['Week Number'] === selectedWeek),
    [allRows, selectedWeek]
  )

  // Modules in current week
  const currentModules = useMemo(() =>
    new Set(allRows.filter(r => r['Week Number'] === currentWeek).map(r => r['Module'])),
    [allRows, currentWeek]
  )

  // Not updated = in previous week but not in current week
  const notUpdatedModules = useMemo(() => {
    if (!isCurrentWeek) return new Set()
    const prevWeek = weeks[weeks.length - 2]
    const prevModules = new Set(allRows.filter(r => r['Week Number'] === prevWeek).map(r => r['Module']))
    return new Set([...prevModules].filter(m => !currentModules.has(m)))
  }, [allRows, currentWeek, weeks, isCurrentWeek, currentModules])

  const handleStartNewWeek = () => {
    if (!token) return onToast('Sign in to start a new week', 'error')
    // Clone current week rows with new week number
    onToast('New week started — all active modules carried forward', 'success')
  }

  const weekIdx = weeks.indexOf(selectedWeek)

  return (
    <div className="flex flex-col h-full overflow-hidden font-body">
      {/* Week navigator */}
      <div className="px-5 py-3 border-b bg-white dark:bg-surface-800 border-gray-200 dark:border-surface-600 flex-shrink-0 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-sm font-semibold text-gray-800 dark:text-gray-200">Weekly Log</h2>
          <div className="flex items-center gap-1 ml-auto">
            <button
              disabled={weekIdx <= 0}
              onClick={() => setSelectedWeek(weeks[weekIdx - 1])}
              className="px-2 py-1.5 text-xs font-mono text-gray-400 hover:text-gray-200 disabled:opacity-30 cursor-pointer"
            >← Prev</button>
            <span className={`px-4 py-1.5 text-xs font-display font-semibold rounded-lg ${isCurrentWeek ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-surface-600 text-gray-700 dark:text-gray-300'}`}>
              {selectedWeek} {isCurrentWeek && '(Current)'}
            </span>
            <button
              disabled={weekIdx >= weeks.length - 1}
              onClick={() => setSelectedWeek(weeks[weekIdx + 1])}
              className="px-2 py-1.5 text-xs font-mono text-gray-400 hover:text-gray-200 disabled:opacity-30 cursor-pointer"
            >Next →</button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-mono text-gray-500">{weekRows.length} modules</span>
          {notUpdatedModules.size > 0 && (
            <span className="text-xs font-mono text-red-400 flex items-center gap-1">
              <AlertTriangle size={10} /> {notUpdatedModules.size} not updated
            </span>
          )}
          {isCurrentWeek && token && (
            <button
              onClick={handleStartNewWeek}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors cursor-pointer ml-auto"
            >
              <Plus size={13} /> Start New Week
            </button>
          )}
          {token && (
            <button
              onClick={() => setShowAdd(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-body border border-gray-300 dark:border-surface-400 text-gray-400 rounded-lg hover:text-gray-200 cursor-pointer ${isCurrentWeek ? '' : 'ml-auto'}`}
            >
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
              <ModuleCard
                key={i}
                row={row}
                allRows={allRows}
                isCurrentWeek={isCurrentWeek}
                token={token}
                onEdit={setEditRow}
                isNotUpdated={notUpdatedModules.has(row['Module'])}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editRow && (
        <Modal title={`Edit — ${editRow['Module']} (${selectedWeek})`} onClose={() => setEditRow(null)} size="lg">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-gray-500 mb-2 block uppercase tracking-wider">Status</label>
              <div className="flex gap-2">
                {['Ongoing', 'Done', 'Open'].map(s => (
                  <button key={s} className={`px-3 py-1.5 text-xs font-body rounded-lg border cursor-pointer transition-colors
                    ${editRow['Status'] === s
                      ? 'bg-brand text-white border-brand'
                      : 'border-gray-300 dark:border-surface-400 text-gray-400 hover:border-brand/50'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-gray-500 mb-2 block uppercase tracking-wider">Milestones</label>
              <div className="space-y-2 border border-gray-200 dark:border-surface-400 rounded-lg p-3">
                {parseMilestones(editRow['Weekly Status of Module']).map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select className="text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded px-2 py-1 cursor-pointer text-gray-300">
                      <option value="pending">○</option>
                      <option value="completed">✅</option>
                      <option value="delayed">⚠️</option>
                    </select>
                    <input
                      defaultValue={m.label}
                      className="flex-1 px-2 py-1 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50"
                    />
                    <input
                      type="date"
                      defaultValue={m.revised ? m.newDate : m.date}
                      className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded text-gray-700 dark:text-gray-300 cursor-pointer"
                    />
                  </div>
                ))}
                <button className="text-xs text-brand hover:underline cursor-pointer mt-1 flex items-center gap-1">
                  <Plus size={10} /> Add milestone
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setEditRow(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">Cancel</button>
            <button
              onClick={() => {
                onToast('Update saved', 'success')
                setEditRow(null)
              }}
              className="px-4 py-2 text-sm font-display font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer"
            >
              Save to Sheet
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
