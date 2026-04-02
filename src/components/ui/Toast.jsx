import { useEffect } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const isSuccess = type === 'success'

  return (
    <div className={`
      fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-modal border animate-slide-up
      ${isSuccess
        ? 'bg-white dark:bg-surface-700 border-emerald-200 dark:border-emerald-800/50'
        : 'bg-white dark:bg-surface-700 border-red-200 dark:border-red-800/50'
      }
    `}>
      {isSuccess
        ? <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
        : <XCircle     size={16} className="text-red-500 flex-shrink-0" />
      }
      <span className="text-sm font-body text-gray-800 dark:text-gray-200">{message}</span>
      <button
        onClick={onClose}
        className="ml-1 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer transition-colors"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  )
}
