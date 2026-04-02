import { useState, useMemo } from 'react'
import StatusChip from '../components/ui/StatusChip.jsx'
import Modal from '../components/ui/Modal.jsx'
import InlineEdit from '../components/ui/InlineEdit.jsx'
import { formatDate, SHEET_NAMES } from '../config.js'
import { Plus } from 'lucide-react'

export default function ScopeTracker({ data, token, save, onToast }) {
  const [selectedSession, setSelectedSession] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const vsInput = data[SHEET_NAMES.VS_INPUT] || []
  const scopeRows = data[SHEET_NAMES.SCOPE_TRACKER] || []

  const vsMap = useMemo(() => {
    const m = {}
    vsInput.forEach((r, i) => { if (r['Module']) m[r['Module']] = { ...r, _idx: i } })
    return m
  }, [vsInput])

  const handlePriorityChange = (module, value) => {
    if (!token) return onToast('Sign in to edit', 'error')
    const row = vsMap[module]
    if (!row) return
    save([{ range: `${SHEET_NAMES.VS_INPUT}!C${row._idx + 2}`, values: [[value]] }])
  }

  const handleVSNoteChange = (module, value) => {
    if (!token) return onToast('Sign in to edit', 'error')
    const row = vsMap[module]
    if (!row) return
    save([{ range: `${SHEET_NAMES.VS_INPUT}!B${row._idx + 2}`, values: [[value]] }])
  }

  const allModules = [...new Set([...Object.keys(vsMap), ...scopeRows.map(r => r['Module'])])].sort()

  return (
    <div className="flex flex-col h-full overflow-hidden font-body">
      <div className="px-5 py-3 border-b bg-white dark:bg-surface-800 border-gray-200 dark:border-surface-600 flex items-center gap-3 flex-shrink-0">
        <h2 className="font-display text-sm font-semibold text-gray-800 dark:text-gray-200">Scope Tracker</h2>
        {token && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer ml-auto">
            <Plus size={13} /> New Session
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Module Priority Table */}
        <div>
          <h3 className="font-display text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Module Priority & VS Notes</h3>
          <div className="bg-white dark:bg-surface-700 border border-gray-200 dark:border-surface-500 rounded-xl overflow-hidden">
            <table className="w-full text-xs font-body">
              <thead className="bg-gray-50 dark:bg-surface-600">
                <tr>
                  {['Module', 'VS Notes', 'Priority', 'Discovery Stakeholder'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-gray-500 border-b border-gray-200 dark:border-surface-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vsInput.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-surface-500/20 hover:bg-gray-50 dark:hover:bg-surface-600/20 transition-colors">
                    <td className="px-4 py-2.5 font-body text-gray-800 dark:text-gray-200">{row['Module']}</td>
                    <td className="px-4 py-2.5">
                      {token
                        ? <InlineEdit value={row['VS Notes']} onSave={v => handleVSNoteChange(row['Module'], v)} placeholder="add note" className="text-gray-700 dark:text-gray-300" />
                        : <span className="font-mono text-xs px-2 py-1 bg-gray-100 dark:bg-surface-600/40 rounded text-gray-400">{row['VS Notes'] || '—'}</span>
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      {token
                        ? <InlineEdit value={row['Priority']} onSave={v => handlePriorityChange(row['Module'], v)} type="text" placeholder="—" className="font-mono text-brand w-12" />
                        : <span className="font-mono text-brand">{row['Priority'] || '—'}</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-gray-400">{row['Discovery Stakeholder'] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scope Sessions */}
        <div>
          <h3 className="font-display text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Scope Sessions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {scopeRows.map((row, i) => (
              <div
                key={i}
                onClick={() => setSelectedSession({ ...row, _idx: i })}
                className="bg-white dark:bg-surface-700 border border-gray-200 dark:border-surface-500 rounded-xl p-4 cursor-pointer hover:border-brand/40 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-sm font-semibold text-gray-900 dark:text-gray-200">{row['Module']}</span>
                  <StatusChip status={row['Status']} size="xs" />
                </div>
                {row['Owner'] && <p className="text-xs text-gray-500 mb-1">Owner: {row['Owner']}</p>}
                {row['Priority'] && <p className="text-xs text-gray-500 mb-2">Priority: {row['Priority']}</p>}
                {row['Start date'] && (
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                    <span>{formatDate(row['Start date'])}</span>
                    {row['End date'] && <><span>→</span><span>{formatDate(row['End date'])}</span></>}
                  </div>
                )}
                {row['Deliverable'] && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{row['Deliverable']}</p>
                )}
              </div>
            ))}
            {scopeRows.length === 0 && (
              <p className="text-sm text-gray-500 col-span-3">No scope sessions logged</p>
            )}
          </div>
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <Modal title={`Scope Session — ${selectedSession['Module']}`} onClose={() => setSelectedSession(null)} size="lg">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Module', key: 'Module' },
              { label: 'Owner', key: 'Owner' },
              { label: 'Priority', key: 'Priority' },
              { label: 'Status', key: 'Status' },
              { label: 'Session Duration', key: 'Session Duration' },
              { label: 'Deliverable', key: 'Deliverable' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs font-mono text-gray-500 mb-1 block">{label}</label>
                <input
                  defaultValue={selectedSession[key]}
                  disabled={!token}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50 disabled:opacity-60"
                />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="text-xs font-mono text-gray-500 mb-1 block">Description of Findings</label>
            <textarea
              defaultValue={selectedSession['Description of findings']}
              disabled={!token}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50 disabled:opacity-60 resize-none"
            />
          </div>
          <div className="mt-3">
            <label className="text-xs font-mono text-gray-500 mb-1 block">Discussion Points</label>
            <textarea
              defaultValue={selectedSession['Discussion points for next meeting']}
              disabled={!token}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50 disabled:opacity-60 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setSelectedSession(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">Close</button>
            {token && <button className="px-4 py-2 text-sm font-display font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer">Save</button>}
          </div>
        </Modal>
      )}
    </div>
  )
}
