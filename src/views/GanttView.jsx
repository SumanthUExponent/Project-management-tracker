import { useState, useMemo } from 'react'
import { SHEET_NAMES } from '../config.js'
import StatusChip from '../components/ui/StatusChip.jsx'
import { Filter } from 'lucide-react'

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

export default function GanttView({ data }) {
  const [phaseFilter, setPhaseFilter] = useState('All')
  const [selected, setSelected]       = useState(null)
  const [zoom, setZoom]               = useState('Month')

  const phaseGantt = data[SHEET_NAMES.PHASE_GANTT] || []
  const vsInput    = data[SHEET_NAMES.VS_INPUT]    || []

  const vsMap = useMemo(() => {
    const m = {}
    vsInput.forEach(r => { if (r['Module']) m[r['Module']] = r })
    return m
  }, [vsInput])

  const tasks = useMemo(() =>
    phaseGantt
      .filter(r => r['Module Name'] && r['Start Date'] && r['End Date'])
      .map((r, i) => {
        const start = parseDateStr(r['Start Date'])
        const end   = parseDateStr(r['End Date'])
        if (!start || !end || end < start) return null
        return { id: i, module: r['Module Name'], stage: r['Module Stage'], phase: r['Phase'], start, end }
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

  // Group tasks by module (keep insertion order)
  const moduleGroups = useMemo(() => {
    const map = new Map()
    filtered.forEach(t => {
      if (!map.has(t.module)) map.set(t.module, [])
      map.get(t.module).push(t)
    })
    return [...map.entries()]
  }, [filtered])

  // Timeline bounds
  const { timeStart, timeEnd, months } = useMemo(() => {
    if (!filtered.length) return { timeStart: new Date(), timeEnd: new Date(), months: [] }
    const timeStart = new Date(Math.min(...filtered.map(t => t.start)))
    const timeEnd   = new Date(Math.max(...filtered.map(t => t.end)))
    timeStart.setDate(1)
    timeEnd.setMonth(timeEnd.getMonth() + 1, 0)
    return { timeStart, timeEnd, months: getMonthsBetween(timeStart, timeEnd) }
  }, [filtered])

  const totalMs = timeEnd - timeStart || 1

  function pct(date) {
    return ((date - timeStart) / totalMs) * 100
  }

  const ROW_H = 32
  const LABEL_W = 180

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b bg-white dark:bg-surface-800 border-gray-200 dark:border-surface-600 flex-shrink-0">
          <h2 className="font-display text-sm font-semibold text-gray-800 dark:text-gray-200">Gantt Chart</h2>
          <div className="flex items-center gap-1 ml-auto">
            {['Month', 'Quarter'].map(z => (
              <button key={z} onClick={() => setZoom(z)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors cursor-pointer
                  ${zoom === z ? 'bg-brand text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-600'}`}>
                {z}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Filter size={12} className="text-gray-500" />
            <select value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)}
              className="text-xs font-mono bg-gray-100 dark:bg-surface-600 border border-gray-300 dark:border-surface-400 rounded px-2 py-1 text-gray-700 dark:text-gray-300 cursor-pointer">
              <option value="All">All</option>
              {phases.map(p => <option key={p} value={p}>Phase {p}</option>)}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 px-5 py-2 border-b border-gray-100 dark:border-surface-600/50 flex-wrap flex-shrink-0">
          {Object.entries(STAGE_COLORS).map(([stage, { bg }]) => (
            <div key={stage} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: bg }} />
              <span className="text-xs font-mono text-gray-500 whitespace-nowrap">{stage}</span>
            </div>
          ))}
        </div>

        {/* Gantt body */}
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center flex-1 text-gray-500 text-sm">
            {phaseGantt.length === 0 ? 'Loading…' : 'No data for selected filters'}
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div style={{ minWidth: LABEL_W + 900 }}>
              {/* Timeline header */}
              <div className="flex sticky top-0 z-10 bg-gray-100 dark:bg-surface-900 border-b border-gray-200 dark:border-surface-600">
                <div style={{ width: LABEL_W, minWidth: LABEL_W }}
                  className="text-xs font-mono text-gray-500 px-3 py-2 border-r border-gray-200 dark:border-surface-600 flex-shrink-0">
                  Module
                </div>
                <div className="flex-1 relative" style={{ height: 32 }}>
                  {zoom === 'Month'
                    ? months.map((m, i) => (
                        <div key={i} className="absolute text-xs font-mono text-gray-400 text-center border-r border-gray-200 dark:border-surface-700 overflow-hidden"
                          style={{
                            left: `${pct(m)}%`,
                            width: `${pct(new Date(m.getFullYear(), m.getMonth() + 1, 1)) - pct(m)}%`,
                            top: 0, bottom: 0, lineHeight: '32px'
                          }}>
                          {m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                        </div>
                      ))
                    : (() => {
                        // Quarter view — group months into quarters
                        const quarters = []
                        months.forEach(m => {
                          const q = Math.floor(m.getMonth() / 3)
                          const yr = m.getFullYear()
                          const key = `Q${q+1} ${yr}`
                          const last = quarters[quarters.length - 1]
                          if (last?.key === key) { last.end = new Date(m.getFullYear(), m.getMonth() + 1, 1) }
                          else quarters.push({ key, start: m, end: new Date(m.getFullYear(), m.getMonth() + 1, 1) })
                        })
                        return quarters.map((q, i) => (
                          <div key={i} className="absolute text-xs font-mono text-gray-400 text-center border-r border-gray-200 dark:border-surface-700"
                            style={{ left: `${pct(q.start)}%`, width: `${pct(q.end) - pct(q.start)}%`, top: 0, bottom: 0, lineHeight: '32px' }}>
                            {q.key}
                          </div>
                        ))
                      })()
                  }
                  {/* Today line */}
                  {new Date() >= timeStart && new Date() <= timeEnd && (
                    <div className="absolute top-0 bottom-0 w-px bg-brand/60 z-10"
                      style={{ left: `${pct(new Date())}%` }} />
                  )}
                </div>
              </div>

              {/* Rows */}
              {moduleGroups.map(([module, moduleTasks]) => (
                <div key={module} className="flex border-b border-gray-100 dark:border-surface-700/50 hover:bg-gray-50 dark:hover:bg-surface-700/20 transition-colors"
                  style={{ height: ROW_H }}>
                  <div style={{ width: LABEL_W, minWidth: LABEL_W }}
                    className="flex items-center px-3 border-r border-gray-200 dark:border-surface-600/40 flex-shrink-0">
                    <span className="text-xs font-body text-gray-700 dark:text-gray-300 truncate">{module}</span>
                  </div>
                  <div className="flex-1 relative">
                    {/* Month grid lines */}
                    {months.map((m, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-r border-gray-100 dark:border-surface-700/30"
                        style={{ left: `${pct(new Date(m.getFullYear(), m.getMonth() + 1, 1))}%` }} />
                    ))}
                    {/* Task bars */}
                    {moduleTasks.map(t => {
                      const left = Math.max(0, pct(t.start))
                      const right = Math.min(100, pct(t.end))
                      const width = right - left
                      if (width <= 0) return null
                      const c = STAGE_COLORS[t.stage] || { bg: '#6b7280', text: '#fff' }
                      return (
                        <div key={t.id}
                          onClick={() => setSelected(t)}
                          title={`${t.module} — ${t.stage}\n${fmtDate(t.start)} → ${fmtDate(t.end)}`}
                          className="absolute top-1.5 bottom-1.5 rounded cursor-pointer hover:brightness-110 transition-all flex items-center overflow-hidden px-1.5"
                          style={{ left: `${left}%`, width: `${width}%`, background: c.bg }}>
                          {width > 5 && (
                            <span className="text-xs font-mono truncate whitespace-nowrap" style={{ color: c.text, fontSize: 10 }}>
                              {t.stage}
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {/* Today line */}
                    {new Date() >= timeStart && new Date() <= timeEnd && (
                      <div className="absolute top-0 bottom-0 w-px bg-brand z-10"
                        style={{ left: `${pct(new Date())}%` }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-64 flex-shrink-0 border-l border-gray-200 dark:border-surface-600 bg-gray-50 dark:bg-surface-800 overflow-y-auto animate-slide-in">
          <div className="p-4 border-b border-gray-200 dark:border-surface-600">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold text-gray-900 dark:text-gray-100">{selected.module}</h3>
                <div className="mt-1"><StatusChip status={selected.stage} /></div>
                <p className="text-xs text-gray-500 mt-1">Phase {selected.phase}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-200 cursor-pointer text-lg">×</button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Start</span>
              <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{fmtDate(selected.start)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">End</span>
              <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{fmtDate(selected.end)}</span>
            </div>
            {vsMap[selected.module] && (
              <>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Priority</span>
                  <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{vsMap[selected.module]['Priority'] || '—'}</span>
                </div>
                {vsMap[selected.module]['VS Notes'] && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">VS Notes</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">{vsMap[selected.module]['VS Notes']}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
