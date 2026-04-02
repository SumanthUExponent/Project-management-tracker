// Google Sheets config — replace with your real values before deploying
export const SHEET_ID = '1IS7UvDBtiCjHSgB6te4veQnmt1RVLkEBUt2vQ5PnjKg'
export const API_KEY = 'AIzaSyD7FXrnco9pGO92uGWodMd7LbeRAyL7TOA'  // read-only, safe to expose
export const OAUTH_CLIENT_ID = '392015736044-hg2mijcqjf79kis0p4s7ecvkebr20aur.apps.googleusercontent.com'

export const SHEET_NAMES = {
  MODULE_GANTT:   'Module Gantt Data',
  PHASE_GANTT:    'Phase Gantt Data',
  GANTT_CHART:    'Gantt Chart',
  VS_INPUT:       'VS Input - module priority',
  WEEKLY_UPDATE:  'Weekly Update',
  CAW:            'CAW',
  WATCHTOWER:     'Watchtower Roadmap',
  INCREMENTAL:    'Incremental Roadmap',
  SCOPE_TRACKER:  'Scope Tracker',
  ENTITIES:       'Entities',
}

// Date parsing — sheets store dates as DD/MM/YYYY strings
export const serialToDate = (val) => {
  if (!val) return null
  const s = String(val).trim()
  const p = s.split('/')
  if (p.length === 3) {
    const [d, m, y] = p.map(Number)
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 1000) return new Date(y, m - 1, d)
  }
  return null
}

// Convert JS Date → DD/MM/YYYY string for writing back to sheet
export const dateToSerial = (date) => {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d)) return ''
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export const formatDate = (val) => {
  const d = serialToDate(val)
  if (!d) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

export const isOverdue = (val) => {
  const d = serialToDate(val)
  if (!d) return false
  return d < new Date()
}

export const daysFrom = (val) => {
  const d = serialToDate(val)
  if (!d) return null
  return Math.ceil((d - new Date()) / 86400000)
}
