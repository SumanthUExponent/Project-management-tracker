import { useState, useMemo } from 'react'
import StatusChip from '../components/ui/StatusChip.jsx'
import Modal from '../components/ui/Modal.jsx'
import { formatDate, SHEET_NAMES } from '../config.js'
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react'

const DEV_STATUSES = ['Ongoing', 'Released to Test Site', 'Released to Prod Site', 'Cancelled']

export default function PBITracker({ data, token, save, append, onToast }) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ phase: '', status: '', app: '' })
  const [showModal, setShowModal] = useState(false)
  const [newPBI, setNewPBI] = useState({})

  const rows = data[SHEET_NAMES.WATCHTOWER] || []

  // Derive column letter for 'Development Status' from sheet header order
  const devStatusCol = useMemo(() => {
    if (!rows.length) return 'J'
    const keys = Object.keys(rows[0])
    const idx = keys.indexOf('Development Status')
    if (idx < 0) return 'J'
    let result = '', n = idx + 1
    while (n > 0) { const rem = (n - 1) % 26; result = String.fromCharCode(65 + rem) + result; n = Math.floor((n - 1) / 26) }
    return result
  }, [rows])

  const filtered = useMemo(() => rows.filter(r => {
    if (filters.phase && r['Phase'] !== filters.phase) return false
    if (filters.status && r['Development Status'] !== filters.status) return false
    if (filters.app && r['App - L1'] !== filters.app) return false
    if (search) {
      const q = search.toLowerCase()
      return (r['PBIID'] || '').toLowerCase().includes(q)
        || (r['Doctype - L3'] || '').toLowerCase().includes(q)
        || (r['Module'] || '').toLowerCase().includes(q)
    }
    return true
  }), [rows, filters, search])

  const grouped = useMemo(() => {
    const g = {}
    filtered.forEach(r => { const mod = r['Module'] || 'Unknown'; if (!g[mod]) g[mod] = []; g[mod].push(r) })
    return g
  }, [filtered])

  const phases = [...new Set(rows.map(r => r['Phase']).filter(Boolean))].sort()
  const apps   = [...new Set(rows.map(r => r['App - L1']).filter(Boolean))].sort()

  // FRICTION-4: default all groups collapsed
  const [collapsed, setCollapsed] = useState(() => {
    const init = {}
    // populated lazily on first render via the grouped memo
    return init
  })
  // Ensure any new module keys are collapsed by default
  const isCollapsed = (mod) => collapsed[mod] !== false  // undefined → collapsed (true)
  const toggleCollapse = (mod) => setCollapsed(prev => ({ ...prev, [mod]: !isCollapsed(mod) }))

  // Spec (Watchtower col F): % complete = rows where Stage-L3 Lifecycle = "Sustenance" / total
  const modulePct = (modRows) => {
    const sustained = modRows.filter(r => r['Stage - L3 Lifecycle'] === 'Sustenance').length
    return modRows.length ? Math.round((sustained / modRows.length) * 100) : 0
  }

  // STUB-3: Add PBI — write to Watchtower sheet
  // Spec column order (17 cols): A=Module, B=PBIID, C=Phase, D=Site-L0, E=App-L1,
  // F=%L2Complete (formula — leave blank), G=Doctype-L3, H=Function,
  // I=Stage-L3 Lifecycle, J=Development Status, K=Priority, L-P=Dates, Q=Notes
  const handleAddPBI = () => {
    if (!newPBI['Module']) { onToast?.('Module is required', 'error'); return }
    const pbiId = `PBI-${String(rows.length + 1).padStart(4, '0')}`
    append(SHEET_NAMES.WATCHTOWER, [[
      newPBI['Module'] || '',          // A: Module
      pbiId,                           // B: PBIID
      newPBI['Phase'] || '',           // C: Phase
      newPBI['Site - L0'] || '',       // D: Site - L0
      newPBI['App - L1'] || '',        // E: App - L1
      '',                              // F: % L2 Complete (formula col — leave blank)
      newPBI['Doctype - L3'] || '',    // G: Doctype - L3
      newPBI['Function'] || '',        // H: Function
      'Scope Discovery',               // I: Stage - L3 Lifecycle (new items start here)
      'Ongoing',                       // J: Development Status
      '',                              // K: Priority
      '', '', '', '', '',              // L-P: Dates (blank — user fills in sheet)
      '',                              // Q: Notes
    ]])
    onToast?.('PBI added', 'success')
    setShowModal(false)
    setNewPBI({})
  }

  const filterLabel = (label) => label === 'Status' ? 'Statuses' : `${label}s`

  return (
    <div className="flex flex-col h-full overflow-hidden font-body">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b bg-white dark:bg-surface-800 border-gray-200 dark:border-surface-600 flex-shrink-0 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-sm font-semibold text-gray-800 dark:text-gray-200">PBI Tracker</h2>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Search PBIID, DocType, Module…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-body bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-500 outline-none focus:border-brand/50" />
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setCollapsed({})} className="text-xs font-mono text-gray-400 hover:text-brand cursor-pointer">Expand all</button>
            <button onClick={() => {
              const all = {}
              Object.keys(grouped).forEach(m => { all[m] = true })
              setCollapsed(all)
            }} className="text-xs font-mono text-gray-400 hover:text-brand cursor-pointer">Collapse all</button>
            {token && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors cursor-pointer">
                <Plus size={13} /> Add PBI
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'phase', label: 'Phase', opts: phases },
            { key: 'status', label: 'Status', opts: DEV_STATUSES },
            { key: 'app', label: 'App', opts: apps },
          ].map(({ key, label, opts }) => (
            <select key={key} value={filters[key]} onChange={e => setFilters(p => ({ ...p, [key]: e.target.value }))}
              className="text-xs font-mono bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded px-2 py-1 text-gray-700 dark:text-gray-300 cursor-pointer">
              <option value="">All {filterLabel(label)}</option>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
          <span className="text-xs font-mono text-gray-500 ml-auto">{filtered.length} PBIs</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">No results</div>
        ) : (
          <table className="w-full text-xs font-body border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-surface-700">
              <tr>
                {['PBIID', 'DocType', 'Site', 'App', 'Function', 'Stage', 'Status', '% L2', 'Scope Start', 'Dev Start', 'UAT Start', 'Migration', 'Go-Live'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-mono text-gray-500 whitespace-nowrap border-b border-gray-200 dark:border-surface-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([mod, modRows]) => {
                const pct = modulePct(modRows)
                const collapsed_ = isCollapsed(mod)
                return [
                  <tr key={`group-${mod}`}
                    className="bg-gray-50 dark:bg-surface-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-surface-600/30 transition-colors"
                    onClick={() => toggleCollapse(mod)}>
                    <td colSpan={13} className="px-3 py-2 border-b border-gray-200 dark:border-surface-600">
                      <div className="flex items-center gap-3">
                        {collapsed_ ? <ChevronRight size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                        <span className="font-display font-semibold text-gray-800 dark:text-gray-200">{mod}</span>
                        <span className="text-gray-500">{modRows.length} PBIs</span>
                        <div className="flex items-center gap-2 ml-auto">
                          <div className="w-24 h-1.5 bg-gray-300 dark:bg-surface-500 rounded-full overflow-hidden">
                            <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono text-brand">{pct}%</span>
                        </div>
                      </div>
                    </td>
                  </tr>,
                  ...(!collapsed_ ? modRows.map((row, ri) => (
                    <tr key={`${mod}-${ri}`} className="border-b border-gray-100 dark:border-surface-600/20 hover:bg-gray-50 dark:hover:bg-surface-700/30 transition-colors">
                      {/* NEW-V6: PBIID contrast raised to gray-500 */}
                      <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">{row['PBIID']}</td>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200 whitespace-nowrap max-w-xs truncate">{row['Doctype - L3']}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row['Site - L0']}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row['App - L1']}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row['Function']}</td>
                      <td className="px-3 py-2"><StatusChip status={row['Stage - L3 Lifecycle']} size="xs" /></td>
                      <td className="px-3 py-2">
                        {token ? (
                          <select value={row['Development Status']}
                            onChange={e => {
                              const actualIdx = rows.indexOf(row)
                              if (actualIdx < 0) return
                              save([{ range: `${SHEET_NAMES.WATCHTOWER}!${devStatusCol}${actualIdx + 2}`, values: [[e.target.value]] }])
                            }}
                            className="text-xs bg-transparent border-0 outline-none cursor-pointer text-gray-300">
                            {DEV_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <StatusChip status={row['Development Status']} size="xs" />
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-brand">{row['% L2 Complete'] || '0'}%</td>
                      {['Module Scope Discovery Start', 'Module Development Start', 'Module UAT Start', 'Migration Start Date', 'Module Go Live Date'].map(f => (
                        <td key={f} className="px-3 py-2 font-mono text-gray-400 whitespace-nowrap">{formatDate(row[f])}</td>
                      ))}
                    </tr>
                  )) : [])
                ]
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add PBI Modal — STUB-3 */}
      {showModal && (
        <Modal title="Add New PBI" onClose={() => setShowModal(false)}>
          <p className="text-sm text-gray-400 mb-4">Fill in the details for the new product backlog item.</p>
          <div className="grid grid-cols-2 gap-3">
            {['Module', 'Doctype - L3', 'Site - L0', 'App - L1', 'Function', 'Phase'].map(f => (
              <div key={f}>
                <label className="text-xs text-gray-500 font-mono mb-1 block">{f}{f === 'Module' && ' *'}</label>
                <input type="text" value={newPBI[f] || ''}
                  onChange={e => setNewPBI(p => ({ ...p, [f]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded-lg text-gray-800 dark:text-gray-200 outline-none focus:border-brand/50" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">Cancel</button>
            <button onClick={handleAddPBI}
              className="px-4 py-2 text-sm font-display font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer">
              Add PBI
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}