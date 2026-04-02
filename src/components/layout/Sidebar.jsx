import { useState, useEffect } from 'react'
import {
  LayoutDashboard, BarChart2, ListChecks, Zap,
  CalendarDays, ScanSearch, RefreshCw, ChevronLeft,
  ChevronRight, Sun, Moon
} from 'lucide-react'

const VIEWS = [
  { id: 'overview',   label: 'Overview',      Icon: LayoutDashboard },
  { id: 'gantt',      label: 'Gantt Chart',   Icon: BarChart2 },
  { id: 'pbi',        label: 'PBI Tracker',   Icon: ListChecks },
  { id: 'caw',        label: 'CAW Board',     Icon: Zap },
  { id: 'weekly',     label: 'Weekly Log',    Icon: CalendarDays },
  { id: 'scope',      label: 'Scope Tracker', Icon: ScanSearch },
  { id: 'increments', label: 'Increments',    Icon: RefreshCw },
]

export default function Sidebar({ activeView, onNavigate, theme, onToggleTheme }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', collapsed)
  }, [collapsed])

  return (
    <aside className={`
      flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out
      border-r border-gray-200 dark:border-surface-600
      bg-white dark:bg-surface-800
      ${collapsed ? 'w-[52px]' : 'w-52'}
    `}>
      {/* Logo / collapse */}
      <div className={`
        flex items-center h-14 border-b border-gray-200 dark:border-surface-600
        ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}
      `}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded bg-brand flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-white font-display">ERP</span>
            </div>
            <span className="font-display font-bold text-sm tracking-wide text-gray-900 dark:text-gray-100 truncate">
              ERP Tracker
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-600 transition-colors cursor-pointer flex-shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {VIEWS.map(({ id, label, Icon }) => {
          const active = activeView === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              title={collapsed ? label : undefined}
              className={`
                w-full flex items-center rounded-lg text-sm font-body transition-all duration-150 cursor-pointer text-left
                ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}
                ${active
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-surface-700'
                }
              `}
            >
              <Icon size={15} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={`
        border-t border-gray-200 dark:border-surface-600 p-2
        ${collapsed ? 'flex justify-center' : 'flex items-center gap-2 px-3'}
      `}>
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          className="p-2 rounded-lg text-gray-400 hover:text-brand hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        {!collapsed && (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            {theme === 'dark' ? 'Dark mode' : 'Light mode'}
          </span>
        )}
      </div>
    </aside>
  )
}
