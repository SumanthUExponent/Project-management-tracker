import { useState, useMemo } from 'react'
import StatusChip from '../components/ui/StatusChip.jsx'
import Modal from '../components/ui/Modal.jsx'
import { formatDate, serialToDate, SHEET_NAMES } from '../config.js'

// DD/MM/YYYY → YYYY-MM-DD for <input type="date">
function toInputDate(val) {
  if (!val) return ''
  const p = String(val).split('/')
  if (p.length === 3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`
  return val
}
import { Plus, Trash2 } from 'lucide-react'

const TYPES = ['Feature', 'Bug', 'Data Import']
const TYPE_COLORS = { Feature: 'bg-blue-500', Bug: 'bg-red-500', 'Data Import': 'bg-amber-500' }

function DurationBar({ start, end }) {
  const s = serialToDate(start)
  const e = serialToDate(end)
  if (!s || !e) return null
  const now = new Date()
  const total = e - s
  if (total <= 0) return null
  const elapsed = Math.min(Math.max(now - s, 0), total)
  const pct = Math.round((elapsed / total) * 100)
  const done = now > e

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1 bg-gray-200 dark:bg-surface-500 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done ? 'bg-emerald-400' : 'bg-brand'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-500 whitespace-nowrap">
        {done ? 'Done' : `${pct}%`}
      </span>
    </div>
  )
}

export default function Increments({ data, token, save, onToast }) {
  const [typeFilter, setTypeFilter] = useState('All')
  const [expandedIdx, setExpandedIdx] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ Type: 'Feature' })

  const rows = useMemo(() =>
    (data[SHEET_NAMES.INCREMENTAL] || []).map((r, i) => ({ ...r, _idx: i })),
    [data]
  )

  const filtered = useMemo(() =>
    typeFilter === 'All' ? rows : rows.filter(r => r['Type'] === typeFilter),
    [rows, typeFilter]
  )

  const counts = useMemo(() => {
    const c = { All: rows.length }
    TYPES.forEach(t => { c[t] = rows.filter(r => r['Type'] === t).length })
    return c
  }, [rows])

  return (
    <div className="flex flex-col h-full overflow-hidden font-body">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b bg-white dark:bg-surface-800 border-gray-200 dark:border-surface-600 flex items-center gap-3 flex-wrap flex-shrink-0">
        <h2 className="font-display text-sm font-semibold text-gray-800 dark:text-gray-200">Increments</h2>
        <div className="flex items-center gap-1">
          {['All', ...TYPES].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg cursor-pointer transition-colors
                ${typeFilter === t ? 'bg-brand text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-600'}
              `}
            >
              {t !== 'All' && <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[t]}`} />}
              {t} <span className="opacity-60">({counts[t] || 0})</span>
            </button>
          ))}
        </div>
        {token && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer ml-auto">
            <Plus size={13} /> New Increment
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">No increments found</div>
        )}
        <div className="space-y-2">
          {filtered.map((row, i) => {
            const isExpanded = expandedIdx === i
            return (
              <div key={i} className="bg-white dark:bg-surface-700 border border-gray-200 dark:border-surface-500 rounded-xl overflow-hidden">
                {/* Row header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-600/20 transition-colors"
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${TYPE_COLORS[row['Type']] || 'bg-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-body text-gray-800 dark:text-gray-200">{row['Module']}</span>
                      {row['Doctype'] && <span className="text-xs text-gray-500">{row['Doctype']}</span>}
                      <StatusChip status={row['Type']} size="xs" />
                    </div>
                    <DurationBar start={row['Start Date']} end={row['End Date']} />
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono text-gray-400">{formatDate(row['Start Date'])}</div>
                      <div className="text-xs font-mono text-gray-500">{formatDate(row['End Date'])}</div>
                    </div>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-surface-500/30 pt-3">
                    {row['Comments'] && (
                      <p className="text-sm text-gray-400 mb-3">{row['Comments']}</p>
                    )}
                    {token && (
                      <div className="grid grid-cols-2 gap-3">
                        {['Module', 'Doctype', 'Comments'].map(f => (
                          <div key={f} className={f === 'Comments' ? 'col-span-2' : ''}>
                            <label className="text-xs font-mono text-gray-500 mb-1 block">{f}</label>
                            <input
                              defaultValue={row[f]}
                              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50"
                            />
                          </div>
                        ))}
                        <div>
                          <label className="text-xs font-mono text-gray-500 mb-1 block">Type</label>
                          <select className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg cursor-pointer text-gray-300">
                            {TYPES.map(t => <option key={t} selected={row['Type'] === t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-mono text-gray-500 mb-1 block">Start Date</label>
                          <input type="date" defaultValue={toInputDate(row['Start Date'])}
                            className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg cursor-pointer text-gray-300" />
                        </div>
                        <div>
                          <label className="text-xs font-mono text-gray-500 mb-1 block">End Date</label>
                          <input type="date" defaultValue={toInputDate(row['End Date'])}
                            className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg cursor-pointer text-gray-300" />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2 mt-3">
                      {token && (
                        <>
                          <button className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 cursor-pointer px-2 py-1 rounded hover:bg-red-900/20">
                            <Trash2 size={12} /> Delete
                          </button>
                          <button className="px-4 py-1.5 text-xs font-display font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer">
                            Save
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <Modal title="New Increment" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            {['Module', 'Doctype', 'Comments'].map(f => (
              <div key={f}>
                <label className="text-xs font-mono text-gray-500 mb-1 block">{f}</label>
                <input onChange={e => setNewItem(p => ({ ...p, [f]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50" />
              </div>
            ))}
            <div>
              <label className="text-xs font-mono text-gray-500 mb-1 block">Type</label>
              <select onChange={e => setNewItem(p => ({ ...p, Type: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg cursor-pointer text-gray-300">
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono text-gray-500 mb-1 block">Start Date</label>
                <input type="date" onChange={e => setNewItem(p => ({ ...p, 'Start Date': e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg cursor-pointer text-gray-300" />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-500 mb-1 block">End Date</label>
                <input type="date" onChange={e => setNewItem(p => ({ ...p, 'End Date': e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg cursor-pointer text-gray-300" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">Cancel</button>
            <button className="px-4 py-2 text-sm font-display font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer"
              onClick={() => { onToast('Increment added', 'success'); setShowAdd(false) }}>
              Add
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
