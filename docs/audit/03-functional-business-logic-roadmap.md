# Document 3 — Functional Business Logic & Workflow Roadmap
**Role: Principal Business Analyst | Lens: Operational Efficiency, Feature Utility**  
**Audit Date:** 2026-04-02  
**App:** ERP Tracker — Exponent Energy  
**Audit Method:** Live browser testing (Chrome DevTools MCP) + source code analysis  
**Screenshot archive:** `docs/audit/screenshots/` — 14 images

---

## 0. Browser Audit Summary

The app loads live data from Google Sheets. All 7 views render real data — the Sheet connection is working. The "Read-only view" + "Sign in to edit" pattern is clearly communicated in the top bar across all views.

**Live data state observed (as of Wk-14, ~Apr 2026):**
- 39 active modules across all phases
- 0 PBIs released to prod
- 1 stuck item (Network Service Module — High priority)
- 0 overdue ETAs
- 6 modules not updated this week
- All 5 phases at 0% released-to-prod progress
- 7 CAW items Open, 7 In Progress, 1 Stuck, 5 Completed
- 131 total PBIs (all in Sustenance stage for Phase 1 modules)
- 5 Increments (all Done)
- 6 modules active in Weekly Log Wk-14

---

## 1. Executive Summary

The ERP Tracker reads from Google Sheets (via Service Account) and displays 7 interconnected views.
The core read path works across all views. **The write path (save-back to Sheets) is either stubbed or missing in 6 of the 7 views.**
The app currently works as a read-only dashboard with a write facade.

**Browser-confirmed:** Signed-out state confirmed — "Read-only view" shows in AuthBar. All data renders without authentication, which is correct for this app's use case (internal team, read is public, write requires Google sign-in).

### Health Matrix

| View | Read | Write | Data Accuracy | Priority to Fix | Browser Notes |
|---|---|---|---|---|---|
| Overview | ✅ Works | N/A (read-only) | ✅ | — | KPI counts confirmed accurate |
| Gantt Chart | ✅ Works | N/A (read-only) | ✅ | — | Timeline renders correctly, today marker visible |
| PBI Tracker | ✅ Works | ❌ Stub — no data written | ⚠️ | High | 131 PBIs loaded, all expanded |
| CAW Board | ✅ Works | ✅ Drag-to-update works | ✅ | — | 20 items across 4 columns |
| Weekly Log | ✅ Works | ❌ Stub — milestones not saved | ❌ Critical | Critical | 6 modules in Wk-14, all Ongoing |
| Scope Tracker | ✅ Works | ⚠️ Partial — VS Notes save wired | ⚠️ | Medium | 14+ modules listed, priority-ranked |
| Increments | ✅ Works | ❌ All save buttons disconnected | ⚠️ | Medium | 5 items, all Done |

---

## 2. Critical Stubs — Complete Broken Feature Map

### STUB-1 — Weekly Log: Start New Week does nothing
**File:** `WeeklyLog.jsx:211-215`  
**Business Impact:** Every Monday, users must manually re-enter every module row with the new week number. With 15+ modules, this is ~15 minutes of copy-paste overhead per week.  
**Browser status:** ✅ CONFIRMED STUB — button triggers toast only, no sheet write

**Current code:**
```js
const handleStartNewWeek = () => {
  if (!token) return onToast('Sign in to start a new week', 'error')
  // Clone current week rows with new week number
  onToast('New week started — all active modules carried forward', 'success')
}
```

**Required implementation:**
```js
const handleStartNewWeek = async () => {
  if (!token) return onToast('Sign in to start a new week', 'error')

  const lastWeek = currentWeek  // e.g. "Wk-14"
  const match = lastWeek?.match(/Wk-(\d+)/i) || lastWeek?.match(/W(\d+)/i)
  const nextNum = match ? Number(match[1]) + 1 : 1
  const nextWeek = `Wk-${String(nextNum).padStart(2, '0')}`

  const currentRows = allRows.filter(r => r['Week Number'] === currentWeek)
  const toCarry = currentRows.filter(r => r['Status'] !== 'Done')

  const newRows = toCarry.map(r => [
    nextWeek,
    r['Module'],
    'Ongoing',
    r['Weekly Status of Module'],
    '',
  ])

  await append(SHEET_NAMES.WEEKLY_UPDATE, newRows)
  onToast(`${nextWeek} started — ${toCarry.length} modules carried forward`, 'success')
}
```

> **Note:** Week numbering format in the live data uses `Wk-14` (with hyphen, capital K), not `W14`. Verify the regex above matches your actual format before deploying.

---

### STUB-2 — Weekly Log: Save milestone edits does nothing
**File:** `WeeklyLog.jsx:339-343`  
**Browser status:** ✅ CONFIRMED STUB — save button shows toast but no sheet write

**Current code:**
```js
onClick={() => {
  onToast('Update saved', 'success')
  setEditRow(null)
}}
```

No `save()` call. Edits are lost on close.

**Required implementation:**
```js
onClick={() => {
  const sheetRow = allRows.indexOf(editRow) + 2
  save([
    { range: `${SHEET_NAMES.WEEKLY_UPDATE}!C${sheetRow}`, values: [[selectedStatus]] },
    { range: `${SHEET_NAMES.WEEKLY_UPDATE}!D${sheetRow}`, values: [[serializedMilestones]] },
  ])
  onToast('Update saved', 'success')
  setEditRow(null)
}}
```

---

### STUB-3 — PBITracker: Add PBI writes empty array
**File:** `PBITracker.jsx` — Add PBI modal  
**Browser status:** ✅ CONFIRMED STUB (code analysis) — not triggered in browser test

**Current code:**
```js
onClick={() => {
  save([]) // append via appendRow
  onToast('PBI added', 'success')
  setShowModal(false)
}}
```

**Required implementation:**
```js
onClick={() => {
  const pbiId = `PBI-${String(rows.length + 1).padStart(4, '0')}`
  save([{
    range: `${SHEET_NAMES.WATCHTOWER}!A:J`,
    values: [[
      pbiId,
      newPBI['Module'] || '',
      newPBI['Site - L0'] || '',
      newPBI['App - L1'] || '',
      newPBI['Function'] || '',
      newPBI['Doctype - L3'] || '',
      newPBI['Phase'] || '',
      '',
      'Ongoing',
      '0',
    ]],
  }])
  onToast('PBI added', 'success')
  setShowModal(false)
}}
```

> Note: Column order must match the exact sheet column order in `Watchtower Roadmap`. Verify against sheet headers before deploying.

---

### STUB-4 — CAW Board: Add New Item form was removed
**File:** `CAWBoard.jsx` — `showAdd` state removed in latest cleanup  
**Browser status:** ✅ CONFIRMED — no "Add" button visible in CAW Board toolbar (dark-04-caw.png)

**Observed in browser:** The CAW Board toolbar shows only `All Teams` and `All Priorities` dropdowns — no "Add Item" button. The 7 Open items can be moved between columns (drag works) but new items cannot be created in-app.

**Required implementation:** Re-add the Add Item modal with these fields:
- Current Area of Work (text)
- Related Module (text or select from module list)
- EE Team (select)
- Priority (Critical / High / Low)
- ETA for Go-live (date)

On save:
```js
append(SHEET_NAMES.CAW, [[
  newItem['Current Area of Work'],
  newItem['Related Module'],
  newItem['EE Team'],
  newItem['EE SPOC'],
  newItem['Priority'],
  newItem['ETA for Go-live'],
  'Open',
]])
```

---

### STUB-5 — Increments: All save/delete buttons are disconnected
**File:** `Increments.jsx:154-160`  
**Browser status:** ✅ CONFIRMED — save/delete buttons visible in expanded rows but no handlers

**Observed in browser:** The Increments view shows 5 items (all Done). The type filter tabs ("All (5)", "Feature (3)", "Bug (1)", "Data Import (1)") work correctly for filtering. Each item shows a full-width green progress bar labeled "Done" with start/end dates. Expandable rows open a form — but save/delete have no `onClick`.

**Fix:**
```js
const [editValues, setEditValues] = useState({})

const handleSave = (row) => {
  const vals = editValues[row._idx] || {}
  const sheetRow = row._idx + 2
  save([
    { range: `${SHEET_NAMES.INCREMENTAL}!A${sheetRow}`, values: [[vals['Module'] ?? row['Module']]] },
    { range: `${SHEET_NAMES.INCREMENTAL}!B${sheetRow}`, values: [[vals['Doctype'] ?? row['Doctype']]] },
    { range: `${SHEET_NAMES.INCREMENTAL}!C${sheetRow}`, values: [[vals['Type'] ?? row['Type']]] },
    { range: `${SHEET_NAMES.INCREMENTAL}!D${sheetRow}`, values: [[vals['Start Date'] ?? row['Start Date']]] },
    { range: `${SHEET_NAMES.INCREMENTAL}!E${sheetRow}`, values: [[vals['End Date'] ?? row['End Date']]] },
    { range: `${SHEET_NAMES.INCREMENTAL}!F${sheetRow}`, values: [[vals['Comments'] ?? row['Comments']]] },
  ])
  onToast('Increment saved', 'success')
  setExpandedIdx(null)
}
```

---

### STUB-6 — ScopeTracker: `allModules` computed but never used
**File:** `ScopeTracker.jsx:35`  
**Browser status:** Confirmed dead code (code analysis)

```js
const allModules = [...new Set([...Object.keys(vsMap), ...scopeRows.map(r => r['Module'])])].sort()
```

Safe to remove or wire up to the add form.

---

## 3. Gantt Chart — Enhancement Roadmap (Phase 2)

### Browser-confirmed context:
- Timeline spans **Oct 2024 → Aug 2026** (18 months)
- Today marker (orange vertical line) is visible at approximately **Mar 2026**
- Chart opens scrolled to Oct 2024 (far left) — today is off the right edge of the initial viewport
- Module names truncate at ~150px: "Exponent Payment Manag...", "Exponent Asset Manageme..."
- 17 modules visible in the default scroll position (all phases shown)

### G1 — Scroll-to-Today button + Auto-scroll on mount ⭐ Highest Value
**Business problem:** Every session starts at Oct 2024. User must scroll ~2/3 across the timeline to see current activity.  
**Browser confirmation:** Confirmed via screenshot — today is at approximately 65% of the timeline width.

**Implementation:**
```jsx
const timelineRef = useRef(null)

// Auto-scroll on mount
useEffect(() => {
  if (!timelineRef.current) return
  const pctToday = pct(new Date())
  const scrollWidth = timelineRef.current.scrollWidth
  // Scroll to put today 300px from left edge
  timelineRef.current.scrollLeft = (pctToday / 100) * scrollWidth - 300
}, [/* run after data loads */])

// Manual scroll-to-today button
const scrollToToday = () => {
  if (!timelineRef.current) return
  const pctToday = pct(new Date())
  const scrollWidth = timelineRef.current.scrollWidth
  timelineRef.current.scrollLeft = (pctToday / 100) * scrollWidth - 300
}

<button onClick={scrollToToday} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-gray-500 hover:text-brand border border-gray-200 dark:border-surface-500 rounded-lg cursor-pointer">
  <Target size={11} /> Today
</button>
```

---

### G2 — Module text search filter
**Business problem:** With 17+ modules visible at default, the phase filter is too coarse.  
**Browser confirmation:** Phase filter dropdown shows "All" with no module search. At 17 rows, scrolling to find a specific module is already slow.

```jsx
const [moduleSearch, setModuleSearch] = useState('')

const filtered = useMemo(() =>
  tasks.filter(t => {
    if (phaseFilter !== 'All' && t.phase !== phaseFilter) return false
    if (moduleSearch && !t.module.toLowerCase().includes(moduleSearch.toLowerCase())) return false
    return true
  }),
  [tasks, phaseFilter, moduleSearch]
)
```

---

### G3 — Phase swimlane dividers
**Business problem:** Phases 1–4 are mixed into a single list.  
**Browser confirmation:** All 17 modules render in one continuous list — no phase grouping visible. Phase differences are only distinguishable by checking the phase filter dropdown.

```jsx
const rowsWithHeaders = []
let lastPhase = null
moduleGroups.forEach(([module, tasks]) => {
  const phase = tasks[0]?.phase
  if (phase !== lastPhase) {
    rowsWithHeaders.push({ type: 'header', phase })
    lastPhase = phase
  }
  rowsWithHeaders.push({ type: 'row', module, tasks })
})
```

---

### G4 — Module progress % on row labels
**Business problem:** The Gantt shows schedule (when), not progress (how far).  
**Browser confirmation:** Module name labels show text only — no progress indicator. The "0%" labels visible in the Overview Phase Progress bars confirm no modules have PBIs released yet, but per-module % L2 Complete data exists in the Watchtower sheet.

---

### G5 — Go-Live milestone diamonds
**Business problem:** Go-Live dates are the most business-critical dates — currently just the end of a green bar.  
**Browser confirmation:** Go-Live bars appear as small green squares at the end of migration bars. Easy to miss among the other colored bars.

---

## 4. Weekly Log Workflow — Full Automation Design

### Current live state (browser-confirmed):
- Wk-14 is the current week
- 6 modules active: Network Service, Customer Service, Exponent Bug Management, Exponent Asset Management, Retrofit Operations, Vehicle Service
- All 6 have status "Ongoing"
- All 6 show `Update due: —` (no due dates configured)
- All completed milestones have strikethrough text
- Vehicle Service shows 3 upcoming (unchecked) milestones — the most "in-progress" looking card

### Current workflow (manual, ~15–20 min/week):
```
Monday morning:
1. Open Weekly Log
2. Identify which modules need updates
3. For each module:
   a. Find last week's entry
   b. Copy it
   c. Change week number
   d. Update milestone statuses
   e. Save
4. Repeat × 6–15 modules
```

### Proposed workflow (automated, ~3–5 min/week):
```
Monday morning:
1. Open Weekly Log → green banner "New week Wk-15 available"
2. Click "Start Week Wk-15" → all non-Done modules cloned instantly
3. For each module that needs update:
   a. Click module card → inline status pills + milestone checkboxes
   b. Toggle status + check completed milestones
   c. Click "Done" (inline save — no modal)
4. Total time: 3–5 minutes
```

### Required changes:
1. Implement `handleStartNewWeek` with `append` mode (STUB-1 above)
2. Implement `handleSaveUpdate` with `save` call (STUB-2 above)
3. Add a "new week available" banner when no entries exist for the current ISO week
4. Set `Update Due On` dates when starting a new week (e.g., auto-set to Friday)

---

## 5. Data Architecture — useSave Hook Enhancement

### Current: update-only
```js
save([{ range: 'SheetName!A1', values: [['value']] }])
```

### Required: add append mode
The `Google Sheets API v4 batchUpdate` overwrites cells. To append rows (new PBI, new CAW item, new week entries), a separate `spreadsheets.values.append` call is needed.

**Recommended useSave interface:**
```js
// Update existing cells
save([{ range: 'Sheet!A2', values: [['updated']] }])

// Append new rows (calls values.append, not batchUpdate)
append('Sheet Name', [['col1', 'col2', 'col3']])
```

**Implementation in useSave.js:**
```js
const append = useCallback(async (sheetName, rows) => {
  if (!token) return
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: rows }),
  })
}, [token])

return { save, append, saveState }
```

---

## 6. Live Data Observations — What the Browser Revealed

These are observations about the actual data state that complement the functional audit:

| View | Observation | Implication |
|---|---|---|
| Overview | All 5 phases at 0% released | No module has reached "Released to Prod" status yet — this is correct for an in-progress ERP implementation |
| Overview | 0 PBIs live | Confirms no module has cleared the release gate |
| CAW Board | 7 Open + 7 In Progress = 14 active items | High workload signal — CAW board is the most operationally relevant view |
| CAW Board | 1 Stuck item (Network Service Module — High) | This item should be escalated; it appears in Overview Active Alerts |
| Increments | All 5 = Done | Incremental development track is clear; no active increments |
| Scope Tracker | "Exponent Asset Management" has ⏳ in VS Notes | This module is "in flight" — scope not yet resolved |
| Scope Tracker | "Discovery Stakeholder" column empty for all | Stakeholder assignments not yet captured in the sheet |
| Weekly Log | `Update due: —` for all cards | The update-due tracking feature is not being used |
| Gantt Chart | Most Phase 2-5 modules still in "Scope Discovery" or "Development" | Confirms the 0% prod release figure — project is mid-execution |

---

## 7. Feature Priority Matrix

| Feature | Business Value | Dev Effort | Priority | Browser Status |
|---|---|---|---|---|
| useSave append mode | Critical (unblocks P0) | Low | **P0 — fix now** | Required for all write stubs |
| Weekly Log: Start New Week (STUB-1) | Critical | Medium | **P0 — fix now** | Confirmed stub |
| Weekly Log: Save milestone edits (STUB-2) | Critical | Low | **P0 — fix now** | Confirmed stub |
| Gantt: Auto-scroll to today on mount | High | Low | **P1** | Confirmed issue |
| Gantt: Scroll-to-Today button (G1) | High | Low | **P1** | Confirmed issue |
| CAW Board: Add New Item (STUB-4) | High | Medium | **P1** | Confirmed missing |
| Gantt: Module search (G2) | Medium | Low | **P1** | Confirmed useful |
| Gantt: Progress % on rows (G4) | High | Low | **P1** | Data available |
| PBI Tracker: Default collapse (FRICTION-4) | Medium | Low | **P1** | Confirmed — wall of data |
| PBI Tracker: Add PBI (STUB-3) | Medium | Medium | **P2** | Confirmed stub |
| Increments: Save/Delete (STUB-5) | Medium | Medium | **P2** | Confirmed broken |
| Gantt: Phase swimlanes (G3) | Medium | Low | **P2** | Confirmed useful |
| Gantt: Go-Live diamonds (G5) | Medium | Low | **P2** | — |
| Modal focus trap (FRICTION-7) | Accessibility | Low | **P1** | — |
| Fix "All Statuss" typo (NEW-V7) | Polish | Trivial | **P3** | Confirmed — embarrassing |
| ScopeTracker: Remove dead `allModules` | Cleanup | Trivial | **P3** | Code analysis |
| Increments: Fix `selected` on option (FRICTION-9) | Code quality | Trivial | **P3** | Confirmed React warning |

---

## 8. Sheet Column Map — Quick Reference

> Use this when implementing write-back. **Always verify column positions against live sheet headers before writing** — these may have shifted.

### Watchtower Roadmap (PBI Tracker)
| Col | Field |
|---|---|
| A | PBIID |
| B | Module |
| C | Site - L0 |
| D | App - L1 |
| E | Function |
| F | Doctype - L3 |
| G | Phase |
| H | Stage - L3 Lifecycle |
| I | Development Status |
| J | % L2 Complete |
| K+ | Date fields (Scope Start, Dev Start, UAT Start, Migration Start, Go-Live) |

> **Browser note:** The PBI table at 1536px shows column headers cut off at "Migrati—", suggesting there are at least 12–13 columns. Verify K+ ordering before writing date fields.

### CAW (CAW Board)
| Col | Field |
|---|---|
| A | Current Area of Work |
| B | Related Module |
| C | EE Team |
| D | EE SPOC |
| E | Priority |
| F | ETA for Go-live |
| G | Status |

### Weekly Update (Weekly Log)
| Col | Field |
|---|---|
| A | Week Number |
| B | Module |
| C | Status |
| D | Weekly Status of Module (milestones text) |
| E | Update Due On |

> **Browser note:** Live data uses week format `Wk-14` (with hyphen). Update STUB-1 regex accordingly — the format is not `W14` or `Week 14`.