export default function KpiCard({ label, value, sub, accent = false, alert = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-start p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left group
        shadow-card hover:shadow-card-md
        ${alert
          ? 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-900/10 hover:border-red-300 dark:hover:border-red-400/50'
          : accent
          ? 'border-orange-200 dark:border-brand/30 bg-orange-50/50 dark:bg-brand/5 hover:border-brand/50'
          : 'border-gray-200 dark:border-surface-600 bg-white dark:bg-surface-700 hover:border-gray-300 dark:hover:border-surface-500'
        }
      `}
    >
      <span className="text-[11px] font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 leading-none">
        {label}
      </span>
      <span className={`
        text-3xl font-display font-bold mt-2 leading-none
        ${alert ? 'text-red-500 dark:text-red-400' : accent ? 'text-brand' : 'text-gray-900 dark:text-gray-100'}
      `}>
        {value}
      </span>
      {sub && (
        <span className={`text-xs mt-1.5 font-body leading-none ${alert ? 'text-red-400/80 dark:text-red-400/70' : 'text-gray-400 dark:text-gray-500'}`}>
          {sub}
        </span>
      )}
    </button>
  )
}
