import { RefreshCw, LogIn, LogOut } from 'lucide-react'
import { signIn, signOut } from '../../services/auth.js'

export default function AuthBar({ user, token, onTokenChange, saveState, lastSync, onRefresh }) {
  const syncLabel = lastSync
    ? (() => {
        const diff = Math.floor((Date.now() - lastSync) / 1000)
        if (diff < 60)   return `Synced ${diff}s ago`
        if (diff < 3600) return `Synced ${Math.floor(diff / 60)}m ago`
        return `Synced at ${lastSync.toLocaleTimeString()}`
      })()
    : 'Not synced'

  const statusColor = saveState === 'error' ? 'bg-red-400' : saveState === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
  const statusText  = saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : syncLabel

  return (
    <header className="h-12 flex items-center justify-between px-5 border-b border-gray-200 dark:border-surface-600 bg-white dark:bg-surface-800 flex-shrink-0">
      {/* Status */}
      <div className="flex items-center gap-2.5">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor}`} />
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{statusText}</span>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors cursor-pointer"
          aria-label="Refresh data"
          title="Refresh data"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Auth */}
      <div className="flex items-center gap-2.5">
        {token ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center">
                <span className="text-[10px] font-display font-bold text-brand">
                  {user?.slice(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-xs font-body text-gray-600 dark:text-gray-300 hidden sm:block">{user}</span>
            </div>
            <button
              onClick={() => signOut(onTokenChange)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-body rounded-lg border border-gray-200 dark:border-surface-500 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors cursor-pointer"
            >
              <LogOut size={11} />
              Sign out
            </button>
          </>
        ) : (
          <>
            <span className="text-xs font-body text-gray-400 dark:text-gray-500 hidden sm:block">
              Read-only view
            </span>
            <button
              onClick={() => signIn()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors cursor-pointer shadow-sm"
            >
              <LogIn size={11} />
              Sign in to edit
            </button>
          </>
        )}
      </div>
    </header>
  )
}
