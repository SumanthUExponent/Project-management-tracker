const CHIP_STYLES = {
  'Released to Prod Site': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800/50',
  'Released to Test Site': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800/50',
  'Ongoing':               'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800/50',
  'Cancelled':             'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-700/50',
  'Stuck':                 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800/50',
  'In Progress':           'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800/50',
  'Open':                  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 ring-1 ring-sky-200 dark:ring-sky-800/50',
  'Completed':             'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800/50',
  'Done':                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800/50',
  'Critical':              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800/50',
  'High':                  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 ring-1 ring-orange-200 dark:ring-orange-800/50',
  'Low':                   'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-700/50',
  'Blocked':               'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800/50',
  'UAT':                   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 ring-1 ring-purple-200 dark:ring-purple-800/50',
  'Development':           'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800/50',
  'Sustenance':            'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 ring-1 ring-teal-200 dark:ring-teal-800/50',
  'Migration':             'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 ring-1 ring-violet-200 dark:ring-violet-800/50',
  'Go-Live':               'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800/50',
  'Scope Discovery':       'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-gray-700/50',
  'Feature':               'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800/50',
  'Bug':                   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800/50',
  'Data Import':           'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800/50',
}

export default function StatusChip({ status, onClick, size = 'sm' }) {
  const style = CHIP_STYLES[status] || 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-700/50'
  const sz = size === 'xs' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2.5 py-0.5'

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full font-body whitespace-nowrap ${sz} ${style} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
    >
      {status || '—'}
    </span>
  )
}
