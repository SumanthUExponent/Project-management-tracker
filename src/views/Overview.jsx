import { useMemo } from 'react'
import KpiCard from '../components/ui/KpiCard.jsx'
import StatusChip from '../components/ui/StatusChip.jsx'
import { isOverdue, daysFrom } from '../config.js'
import { AlertTriangle, TrendingUp, Clock } from 'lucide-react'

export default function Overview({ data, onNavigate }) {
  const watchtower = data['Watchtower Roadmap'] || []
  const caw        = data['CAW'] || []
  const weekly     = data['Weekly Update'] || []
  const moduleGantt = data['Module Gantt Data'] || []

  const stats = useMemo(() => {
    const activeModules = new Set(moduleGantt.map(r => r['Module Name']).filter(Boolean)).size

    const releasedToProd = watchtower.filter(r =>
      r['Development Status'] === 'Released to Prod Site'
    ).length

    const stuckCAW   = caw.filter(r => r['Status'] === 'Stuck').length
    const overdueCAW = caw.filter(r =>
      r['Status'] !== 'Completed' && isOverdue(r['ETA for Go-live'])
    ).length

    const weekNums    = new Set(weekly.map(r => r['Week Number']).filter(Boolean))
    const latestWeek  = [...weekNums].pop()
    const updatedMods = new Set(weekly.filter(r => r['Week Number'] === latestWeek).map(r => r['Module']))
    const allMods     = new Set(weekly.map(r => r['Module']).filter(Boolean))
    const notUpdated  = [...allMods].filter(m => !updatedMods.has(m) && m).length

    const phases = {}
    watchtower.forEach(r => {
      const ph = r['Phase']
      if (!ph) return
      if (!phases[ph]) phases[ph] = { total: 0, released: 0 }
      phases[ph].total++
      if (r['Development Status'] === 'Released to Prod Site') phases[ph].released++
    })

    return { activeModules, releasedToProd, stuckCAW, overdueCAW, notUpdated, phases }
  }, [watchtower, caw, weekly, moduleGantt])

  const alertCAW = useMemo(() =>
    caw.filter(r => (r['Priority'] === 'Critical' || r['Status'] === 'Stuck') && r['Status'] !== 'Completed')
      .sort((a, b) => {
        if (a['Status'] === 'Stuck' && b['Status'] !== 'Stuck') return -1
        if (b['Status'] === 'Stuck' && a['Status'] !== 'Stuck') return 1
        return 0
      })
      .slice(0, 8),
    [caw]
  )

  const phases = Object.entries(stats.phases)

  return (
    <div className="p-6 space-y-5 overflow-y-auto h-full font-body animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-gray-900 dark:text-gray-100">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">ERP implementation at a glance</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Active Modules"  value={stats.activeModules}    sub="across all phases"   onClick={() => onNavigate('gantt')} />
        <KpiCard label="Released to Prod" value={stats.releasedToProd}  sub="PBIs live"  accent   onClick={() => onNavigate('pbi')} />
        <KpiCard label="Stuck Items"      value={stats.stuckCAW}        sub="need attention" alert={stats.stuckCAW > 0}   onClick={() => onNavigate('caw')} />
        <KpiCard label="Overdue ETAs"     value={stats.overdueCAW}      sub="CAW items"      alert={stats.overdueCAW > 0} onClick={() => onNavigate('caw')} />
        <KpiCard label="Not Updated"      value={stats.notUpdated}      sub="modules this wk" alert={stats.notUpdated > 0} onClick={() => onNavigate('weekly')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Phase Progress */}
        <div className="bg-white dark:bg-surface-700 border border-gray-200 dark:border-surface-600 rounded-xl p-5 shadow-card">
          <h2 className="font-display text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-brand" />
            Phase Progress
          </h2>
          <div className="space-y-4">
            {phases.length === 0 && <p className="text-sm text-gray-400">No phase data</p>}
            {phases.map(([phase, { total, released }]) => {
              const pct = total > 0 ? Math.round((released / total) * 100) : 0
              return (
                <div key={phase}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">Phase {phase}</span>
                    <span className="text-xs font-mono text-brand font-medium">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-surface-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{released}/{total} released</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CAW Alerts */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-700 border border-gray-200 dark:border-surface-600 rounded-xl p-5 shadow-card">
          <h2 className="font-display text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <AlertTriangle size={14} className="text-brand" />
            Active Alerts — CAW
          </h2>
          {alertCAW.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No active alerts</p>
          )}
          <div className="space-y-0">
            {alertCAW.map((item, i) => {
              const days    = daysFrom(item['ETA for Go-live'])
              const overdue = isOverdue(item['ETA for Go-live'])
              return (
                <div key={i} className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 dark:border-surface-600/40 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusChip status={item['Status']} size="xs" />
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{item['Current Area of Work']}</span>
                    {item['Related Module'] && (
                      <span className="text-xs text-gray-400 hidden sm:block">{item['Related Module']}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusChip status={item['Priority']} size="xs" />
                    {days !== null && (
                      <span className={`text-xs font-mono whitespace-nowrap ${overdue ? 'text-red-500 dark:text-red-400' : days <= 3 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400'}`}>
                        {overdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={() => onNavigate('caw')} className="mt-3 text-xs text-brand hover:underline cursor-pointer font-body">
            View all CAW items →
          </button>
        </div>
      </div>

      {/* Weekly Log Gap */}
      {stats.notUpdated > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock size={14} className="text-amber-500 dark:text-amber-400" />
            <span className="text-sm font-display font-semibold text-amber-600 dark:text-amber-400">Weekly log behind</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stats.notUpdated} module(s) haven't logged an update this week.
          </p>
          <button onClick={() => onNavigate('weekly')} className="mt-2 text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-body">
            Open Weekly Log →
          </button>
        </div>
      )}
    </div>
  )
}
