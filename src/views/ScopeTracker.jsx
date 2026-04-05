import { useState, useMemo } from 'react'
import StatusChip from '../components/ui/StatusChip.jsx'
import Modal from '../components/ui/Modal.jsx'
import InlineEdit from '../components/ui/InlineEdit.jsx'
import { formatDate, SHEET_NAMES } from '../config.js'
import { Plus } from 'lucide-react'

function colLetter(idx) {
  let result = '', n = idx + 1
  while (n > 0) { const rem = (n - 1) % 26; result = String.fromCharCode(65 + rem) + result; n = Math.floor((n - 1) / 26) }
  return result
}

export default function ScopeTracker({ data, token, save, append, onToast }) {
  const [selectedSession, setSelectedSession] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [newSession, setNewSession] = useState({})

  const vsInput   = data[SHEET_NAMES.VS_INPUT]      || []
  const scopeRows = data[SHEET_NAMES.SCOPE_TRACKER]  || []

  // Derive column maps from header order — never hardcode column letters
  const vsColMap = useMemo(() => {
    if (!vsInput.length) return {}
    return Object.fromEntries(Object.keys(vsInput[0]).map((k, i) => [k, colLetter(i)]))
  }, [vsInput])

  const scopeColMap = useMemo(() => {
    if (!scopeRows.length) return {}
    return Object.fromEntries(Object.keys(scopeRows[0]).map((k, i) => [k, colLetter(i)]))
  }, [scopeRows])

  const vsMap = useMemo(() => {
    const m = {}
    vsInput.forEach((r, i) => { if (r['Module']) m[r['Module']] = { ...r, _idx: i } })
    return m
  }, [vsInput])

  const handlePriorityChange = (module, value) => {
    if (!token) return onToast?.('Sign in to edit', 'error')
    const row = vsMap[module]
    if (!row || !vsColMap['Priority']) return
    save([{ range: `${SHEET_NAMES.VS_INPUT}!${vsColMap['Priority']}${row._idx + 2}`, values: [[value]] }])
  }

  const handleVSNoteChange = (module, value) => {
    if (!token) return onToast?.('Sign in to edit', 'error')
    const row = vsMap[module]
    if (!row || !vsColMap['VS Notes']) return
    save([{ range: `${SHEET_NAMES.VS_INPUT}!${vsColMap['VS Notes']}${row._idx + 2}`, values: [[value]] }])
  }

  const openSession = (row, idx) => {
    setSelectedSession({ ...row, _idx: idx })
    setEditValues({
      'Module':                           row['Module'] || '',
      'Owner':                            row['Owner'] || '',
      'Priority':                         row['Priority'] || '',
      'Status':                           row['Status'] || '',
      'Session Duration':                 row['Session Duration'] || '',
      'Deliverable':                      row['Deliverable'] || '',
      'Description of findings':          row['Description of findings'] || '',
      'Discussion points for next meeting': row['Discussion points for next meeting'] || '',
    })
  }

  const handleSessionSave = () => {
    if (!selectedSession) return
    const sheetRow = selectedSession._idx + 2
    const updates = []
    Object.entries(editValues).forEach(([field, value]) => {
      if (scopeColMap[field]) {
        updates.push({ range: `${SHEET_NAMES.SCOPE_TRACKER}!${scopeColMap[field]}${sheetRow}`, values: [[value]] })
      }
    })
    if (updates.length) save(updates)
    onToast?.('Session saved', 'success')
    setSelectedSession(null)
  }

  const handleAddSession = async () => {
    if (!newSession['Module']?.trim()) { onToast?.('Module is required', 'error'); return }
    // Spec column order: A=Module, B=Priority, C=Owner, D=Status, E=Start date,
    // F=End date, G=Session Duration, H=Description of findings,
    // I=Discussion points for next meeting, J=Deliverable
    await append(SHEET_NAMES.SCOPE_TRACKER, [[
      newSession['Module'] || '',                              // A
      newSession['Priority'] || '',                            // B
      newSession['Owner'] || '',                               // C
      newSession['Status'] || 'Open',                          // D
      newSession['Start date'] || '',                          // E
      newSession['End date'] || '',                            // F
      newSession['Session Duration'] || '',                    // G
      newSession['Description of findings'] || '',             // H
      newSession['Discussion points for next meeting'] || '',  // I
      newSession['Deliverable'] || '',                         // J
    ]])
    onToast?.('Session added', 'success')
    setShowAdd(false)
    setNewSession({})
  }

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
                onClick={() => openSession(row, i)}
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

      {/* Session Detail Modal — now controlled + wired save */}
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
                  value={editValues[key] ?? ''}
                  onChange={e => setEditValues(p => ({ ...p, [key]: e.target.value }))}
                  disabled={!token}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50 disabled:opacity-60"
                />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="text-xs font-mono text-gray-500 mb-1 block">Description of Findings</label>
            <textarea
              value={editValues['Description of findings'] ?? ''}
              onChange={e => setEditValues(p => ({ ...p, 'Description of findings': e.target.value }))}
              disabled={!token}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50 disabled:opacity-60 resize-none"
            />
          </div>
          <div className="mt-3">
            <label className="text-xs font-mono text-gray-500 mb-1 block">Discussion Points</label>
            <textarea
              value={editValues['Discussion points for next meeting'] ?? ''}
              onChange={e => setEditValues(p => ({ ...p, 'Discussion points for next meeting': e.target.value }))}
              disabled={!token}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50 disabled:opacity-60 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setSelectedSession(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">Close</button>
            {token && <button onClick={handleSessionSave} className="px-4 py-2 text-sm font-display font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer">Save</button>}
          </div>
        </Modal>
      )}

      {/* New Session Modal — TC-27 */}
      {showAdd && (
        <Modal title="New Scope Session" onClose={() => setShowAdd(false)}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Module *', key: 'Module' },
              { label: 'Priority', key: 'Priority' },
              { label: 'Owner', key: 'Owner' },
              { label: 'Status', key: 'Status' },
              { label: 'Start Date', key: 'Start date' },
              { label: 'End Date', key: 'End date' },
              { label: 'Session Duration', key: 'Session Duration' },
              { label: 'Deliverable', key: 'Deliverable' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs font-mono text-gray-500 mb-1 block">{label}</label>
                <input
                  value={newSession[key] || ''}
                  onChange={e => setNewSession(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50"
                />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="text-xs font-mono text-gray-500 mb-1 block">Description of Findings</label>
            <textarea
              value={newSession['Description of findings'] || ''}
              onChange={e => setNewSession(p => ({ ...p, 'Description of findings': e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50 resize-none"
            />
          </div>
          <div className="mt-3">
            <label className="text-xs font-mono text-gray-500 mb-1 block">Discussion Points</label>
            <textarea
              value={newSession['Discussion points for next meeting'] || ''}
              onChange={e => setNewSession(p => ({ ...p, 'Discussion points for next meeting': e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">Cancel</button>
            <button onClick={handleAddSession} className="px-4 py-2 text-sm font-display font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer">Add Session</button>
          </div>
        </Modal>
      )}
    </div>
  )
}