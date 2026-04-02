import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/layout/Sidebar.jsx'
import AuthBar from './components/layout/AuthBar.jsx'
import Toast from './components/ui/Toast.jsx'
import Overview from './views/Overview.jsx'
import GanttView from './views/GanttView.jsx'
import PBITracker from './views/PBITracker.jsx'
import CAWBoard from './views/CAWBoard.jsx'
import WeeklyLog from './views/WeeklyLog.jsx'
import ScopeTracker from './views/ScopeTracker.jsx'
import Increments from './views/Increments.jsx'
import { useSheets } from './hooks/useSheets.js'
import { useSave } from './hooks/useSave.js'
import { initGoogleAuth, getStoredToken } from './services/auth.js'
import { SHEET_NAMES } from './config.js'

const ALL_SHEETS = Object.values(SHEET_NAMES)

const VIEWS = {
  overview:   Overview,
  gantt:      GanttView,
  pbi:        PBITracker,
  caw:        CAWBoard,
  weekly:     WeeklyLog,
  scope:      ScopeTracker,
  increments: Increments,
}

export default function App() {
  // Theme
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  // Auth
  const [token, setToken] = useState(() => getStoredToken())
  const [user, setUser] = useState(null)
  useEffect(() => {
    initGoogleAuth((newToken) => {
      setToken(newToken)
      if (newToken) {
        // Fetch user email from token info
        fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${newToken}`)
          .then(r => r.json())
          .then(d => setUser(d.email || d.name || 'User'))
          .catch(() => setUser('User'))
      } else {
        setUser(null)
      }
    })
  }, [])

  // Navigation
  const [activeView, setActiveView] = useState('overview')

  // Data
  const { data, loading, error, lastSync, refresh } = useSheets(ALL_SHEETS, token)

  // Save
  const { save, saveState } = useSave(token)

  // Toast
  const [toast, setToast] = useState(null)
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() })
  }, [])

  const ActiveView = VIEWS[activeView] || Overview

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-surface-900 font-body">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AuthBar
          user={user}
          token={token}
          onTokenChange={setToken}
          saveState={saveState}
          lastSync={lastSync}
          onRefresh={refresh}
        />

        {/* View content */}
        <main className="flex-1 overflow-hidden bg-white dark:bg-surface-800">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-mono text-gray-500">Loading from Google Sheets…</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="max-w-md text-center">
                <p className="text-red-400 font-display font-semibold mb-2">Failed to load data</p>
                <p className="text-sm text-gray-500 mb-4 font-mono">{error}</p>
                <p className="text-xs text-gray-600 mb-4">
                  Make sure your API key is set in <code className="text-brand">src/config.js</code> and the Sheet is shared publicly.
                </p>
                <button
                  onClick={refresh}
                  className="px-4 py-2 text-sm font-display font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark cursor-pointer"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <ActiveView
              data={data}
              token={token}
              save={save}
              onNavigate={setActiveView}
              onToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
