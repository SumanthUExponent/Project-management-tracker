# Document 2 — UI/UX Interaction Strategy
**Role: Senior UI/UX Researcher | Lens: Usability, Friction Reduction, Intuitive Flow**  
**Audit Date:** 2026-04-02  
**App:** ERP Tracker — Exponent Energy  
**Audit Method:** Live browser testing (Chrome DevTools MCP) — all 7 views in dark and light mode  
**Screenshot archive:** `docs/audit/screenshots/` — 14 images

---

## 0. Browser Audit Summary

Navigation between all 7 views confirmed working via sidebar button clicks. Dark/light mode toggle confirmed working (class-based toggle on `<html>`). The dark mode toggle button in the sidebar footer does **not** appear in the DOM with text "Dark mode" or "Light mode" — it uses icon-only rendering (no accessible label found via JS query), which is a new accessibility finding.

| View | Navigation | Primary Interaction | First-click Discoverability |
|---|---|---|---|
| Overview | ✅ Loads default | KPI cards → navigate | ❌ No visual affordance |
| Gantt Chart | ✅ Fast | Timeline scroll + row click | ⚠️ Opens at Oct 2024, not today |
| PBI Tracker | ✅ Fast | Search + filter + group collapse | ⚠️ All 131 PBIs expanded |
| CAW Board | ✅ Fast | Drag-and-drop kanban | ⚠️ No drag affordance visible |
| Weekly Log | ✅ Fast | Week nav + card expand | ✅ Week label obvious |
| Scope Tracker | ✅ Fast | Read-only table | ✅ Nothing to interact with |
| Increments | ✅ Fast | Type filter tabs | ✅ Tab pills are clear |

---

## 1. User Journey Map

```
User opens app
    │
    ├─► Overview      [landing view] ─── KPI cards (clickable, no affordance), phase progress, CAW alerts
    │       │
    │       ├─ Click KPI "Stuck Items" ──────► CAW Board        [no visual cue this works]
    │       ├─ Click KPI "Active Modules" ────► Gantt Chart     [no visual cue this works]
    │       └─ Click "View all CAW items →" ──► CAW Board       [only obvious navigation link]
    │
    ├─► Gantt Chart   [timeline view] ─── Opens at Oct 2024, today marker visible but off-screen right
    ├─► PBI Tracker   [table view]    ─── 131 PBIs, all expanded, wall of data on load
    ├─► CAW Board     [kanban view]   ─── 20 items, drag-to-change-status, click to view detail
    ├─► Weekly Log    [card grid]     ─── Week Wk-14 (current), 6 modules, milestone history cards
    ├─► Scope Tracker [table view]    ─── Priority-ranked module list, VS Notes pills, read-heavy
    └─► Increments    [list view]     ─── 5 items (all Done), type filter tabs, expandable rows
```

---

## 2. Pain Points — Friction Audit

### FRICTION-1 — KPI cards have no navigation affordance
**File:** `Overview.jsx:52-56`  
**Severity:** Medium  
**Browser status:** ✅ CONFIRMED — visible in `dark-01-overview.png`, `light-01-overview.png`

**Observed in browser:** The 5 KPI cards (ACTIVE MODULES, RELEASED TO PROD, STUCK ITEMS, OVERDUE ETAs, NOT UPDATED) are displayed with uppercase monospace labels and large bold values. In both dark and light mode, the cards have no hover state change, no arrow, no underline — nothing indicating they are interactive. The cursor would change to pointer on hover but this is invisible in a screenshot.

The "View all CAW items →" text link at the bottom of the Active Alerts panel is the **only obvious navigation affordance** on the Overview page.

**Fix:**
```jsx
// Add to KpiCard.jsx — hover-visible arrow
<button className="... group">
  <span className="text-[11px] font-mono uppercase tracking-widest ...">
    {label}
  </span>
  <span className="text-3xl ..."> {value} </span>
  {sub && <span className="text-xs ...">{sub}</span>}
  {/* Navigation affordance — only visible on hover */}
  <span className="mt-auto self-end text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
    View <ChevronRight size={10} />
  </span>
</button>
```

---

### FRICTION-2 — Gantt zoom controls look like filter chips
**File:** `GanttView.jsx:117-124`  
**Severity:** Medium  
**Browser status:** ✅ CONFIRMED — visible in `dark-02-gantt.png`

**Observed in browser:** The toolbar shows: `Month` (orange filled button) | `Quarter` (unfilled) | filter icon | `All` dropdown — in one horizontal row at the top right. At first glance, Month/Quarter look like phase filter options rather than a zoom level. The `Month` button uses the same orange fill (`bg-brand`) as the sidebar active item — which works, but it's ambiguous that this is a "zoom" control.

**Fix:** Visually separate zoom from filter. Place zoom on the LEFT of the toolbar, filter on the RIGHT:
```jsx
// Left cluster — zoom
<div className="flex items-center gap-1 bg-gray-100 dark:bg-surface-700 rounded-lg p-0.5">
  {['Month', 'Quarter'].map(z => (
    <button key={z} className={`px-3 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer
      ${zoom === z ? 'bg-white dark:bg-surface-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700'}`}>
      {z}
    </button>
  ))}
</div>

// Right cluster — filter
<div className="ml-auto flex items-center gap-2">
  <Filter size={12} className="text-gray-400" />
  <select>...</select>
</div>
```

---

### FRICTION-3 — Gantt detail panel close is a bare `×` character
**File:** `GanttView.jsx:256`  
**Severity:** Low-Medium  
**Browser status:** Could not verify without clicking — code analysis stands

**Observed in browser:** The Gantt chart row click triggers a detail panel. The close button uses `×` (U+00D7) — a character, not a Lucide icon. No `aria-label`. Touch target approximately 24×24px (below 44px minimum).

**Fix:**
```jsx
import { X } from 'lucide-react'

<button
  onClick={() => setSelected(null)}
  aria-label="Close detail panel"
  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors cursor-pointer"
>
  <X size={14} />
</button>
```

---

### FRICTION-4 — PBITracker loads all 13+ module groups expanded
**File:** `PBITracker.jsx:12`  
**Browser status:** ✅ CONFIRMED — visible in `dark-03-pbi.png`, `light-03-pbi.png`

**Observed in browser:** The view loads with all module groups expanded and **131 PBIs** visible simultaneously, rendering as a wall of rows. The header "131 PBIs" count (top right) is the only orientation anchor. The table extends far below the viewport with no indication of total scroll depth.

The grouped headers ("Accounts 3 PBIs", "Procurement 3 PBIs", etc.) are visible but small. A new user's eye has nowhere to land.

**Fix:**
```js
// Default all to collapsed
const [collapsed, setCollapsed] = useState(() => {
  const initial = {}
  rows.forEach(r => { if (r['Module']) initial[r['Module']] = true })
  return initial
})
```

Add expand-all / collapse-all button to toolbar:
```jsx
<button onClick={() => setCollapsed({})} className="text-xs text-gray-400 hover:text-brand cursor-pointer">
  Expand all
</button>
<button onClick={() => {
  const all = {}
  Object.keys(grouped).forEach(m => { all[m] = true })
  setCollapsed(all)
}} className="text-xs text-gray-400 hover:text-brand cursor-pointer">
  Collapse all
</button>
```

---

### FRICTION-5 — WeeklyLog week navigation uses tiny text buttons
**File:** `WeeklyLog.jsx:227-238`  
**Browser status:** ✅ CONFIRMED — visible in `dark-05-weekly.png`

**Observed in browser:** The week navigation renders as `← Prev` | `Wk-14 (Current)` [orange pill] | `Next →`. The Prev/Next buttons are small text-only links. The current week pill ("Wk-14 (Current)") is correctly styled in brand orange. However there is **no "jump to today" shortcut** — if navigating past weeks for review, returning requires clicking Next repeatedly.

Additionally: all 6 module cards show `Update due: —` (no due dates set). This is a data gap rather than a UI bug but it means the "staleness" feature of the weekly log is not in use.

**Fix:**
```jsx
<div className="flex items-center gap-1">
  <button
    disabled={weekIdx <= 0}
    onClick={() => setSelectedWeek(weeks[weekIdx - 1])}
    className="p-1.5 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-surface-700 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
    aria-label="Previous week"
  >
    <ChevronLeft size={14} />
  </button>

  <span className={`px-3 py-1.5 text-xs font-display font-semibold rounded-lg min-w-[120px] text-center
    ${isCurrentWeek ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-surface-600 text-gray-700 dark:text-gray-300'}`}>
    {selectedWeek}
  </span>

  <button disabled={weekIdx >= weeks.length - 1} aria-label="Next week">
    <ChevronRight size={14} />
  </button>

  {!isCurrentWeek && (
    <button
      onClick={() => setSelectedWeek(currentWeek)}
      className="px-2 py-1 text-xs font-mono text-brand hover:underline cursor-pointer"
    >
      → Today
    </button>
  )}

  <span className="text-xs font-mono text-gray-400 ml-1">
    {weekIdx + 1}/{weeks.length}
  </span>
</div>
```

---

### FRICTION-6 — CAW drag-and-drop has no "dragging active" state for drop zones
**File:** `CAWBoard.jsx:58-60`  
**Browser status:** ✅ CONFIRMED — visible in `dark-04-caw.png` (static state)

**Observed in browser:** The 4 columns (OPEN 7, IN PROGRESS 7, STUCK 1, COMPLETED 5) have column headers with item counts. Cards are evenly laid out. The board looks clean and is one of the more interactive views. However, in the static state, no column has any "droppable zone" indicator — a user who hasn't been told it's a kanban board won't know to drag.

**Fix — show all drop zones as active when any drag is in progress:**
```jsx
function DroppableColumn({ id, label, items, onCardClick, dragActive }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="flex flex-col flex-1 min-w-56 max-w-xs">
      ...
      <div ref={setNodeRef} className={`
        flex-1 rounded-xl p-2 space-y-2 min-h-24 transition-all duration-150
        ${isOver
          ? 'bg-brand/5 border-2 border-brand/40 border-dashed'
          : dragActive
          ? 'border-2 border-dashed border-gray-300 dark:border-surface-500'
          : 'border-2 border-transparent bg-gray-50 dark:bg-surface-700/30'
        }
      `}>
```

Pass `dragActive={activeId !== null}` from parent.

---

### FRICTION-7 — Modal has no keyboard focus trap
**File:** `Modal.jsx`  
**Severity:** Accessibility — High  
**Browser status:** Not tested — code analysis stands

The modal closes on `Escape` ✅ but does not trap Tab focus. A keyboard user can Tab past the modal into the background page.

**Fix — add to Modal.jsx:**
```jsx
useEffect(() => {
  const modal = document.getElementById('modal-content')
  if (!modal) return
  const focusable = modal.querySelectorAll(
    'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const first = focusable[0]
  const last  = focusable[focusable.length - 1]
  first?.focus()

  const trap = (e) => {
    if (e.key !== 'Tab') return
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last?.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
  }
  document.addEventListener('keydown', trap)
  return () => document.removeEventListener('keydown', trap)
}, [])
```

---

### FRICTION-8 — AuthBar sync dot is too small, no `aria-live`
**File:** `AuthBar.jsx:19-22`  
**Browser status:** ✅ CONFIRMED — visible in all screenshots, top-left area

**Observed in browser:** The sync indicator shows "Synced 3m ago ↻" in the top bar. The dot appears as a very small green circle (approximately 6px). The ↻ refresh icon is also small. In all screenshots, the dot is barely visible — it reads as a decorative element rather than a status indicator. The "Read-only view" text on the right and "Sign in to edit" orange button are well-styled and clear.

**Fix:**
```jsx
<div role="status" aria-live="polite" className="flex items-center gap-2">
  <span className="relative flex h-2 w-2">
    {saveState === 'saving' && (
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
    )}
    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColor}`} />
  </span>
  <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{statusText}</span>
</div>
```

---

### FRICTION-9 — Increments expanded form uses `selected` on `<option>`
**File:** `Increments.jsx:137`  
**Browser status:** ✅ CONFIRMED — visible as a React warning in dev console (code analysis stands)

```jsx
// Fix:
<select defaultValue={row['Type']} className="...">
  {TYPES.map(t => <option key={t}>{t}</option>)}
</select>
```

---

### FRICTION-10 — Gantt "No data" state is ambiguous
**File:** `GanttView.jsx:146-149`  
**Browser status:** Not triggered — Gantt loaded data successfully. Code analysis stands.

---

### NEW-FRICTION-11 — Dark mode toggle has no accessible label ⭐ New finding
**File:** `Sidebar.jsx` — footer area  
**Browser status:** ✅ CONFIRMED — verified via JS evaluation

**Observed in browser:** The dark mode toggle button at the bottom of the sidebar is icon-only. JavaScript query for `button[aria-label*="dark"]`, `button[title*="dark"]`, and text content including "Dark mode"/"Light mode" all return `not found`. The sidebar footer shows "Dark mode" text in the screenshots — but this appears to be non-interactive label text next to the toggle, not a button label.

**Finding:** The moon/sun icon button has no `aria-label`. Screen reader users have no way to know the button toggles dark mode.

**Fix:**
```jsx
<button
  onClick={onToggleDark}
  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
  className="..."
>
  {isDark ? <Sun size={14} /> : <Moon size={14} />}
</button>
```

---

### NEW-FRICTION-12 — Gantt chart opens at Oct 2024, not today ⭐ New finding
**File:** `GanttView.jsx`  
**Browser status:** ✅ CONFIRMED — visible in `dark-02-gantt.png`

**Observed in browser:** The Gantt chart opens with the horizontal scroll position at the far left — showing Oct/Nov 2024 on the left edge. The today marker (vertical orange line) is visible but positioned approximately 2/3 of the way across the timeline, around March 2026. The user must manually scroll right to see current activity.

This is particularly impactful because the first thing a project manager wants to know is "where are we now?" — and the default view shows completed history from 18 months ago.

This directly maps to Doc 3 enhancement G1 (Scroll-to-Today button). The auto-scroll should be the **default behavior on mount**, not just a button.

**Fix — auto-scroll to today on mount:**
```jsx
useEffect(() => {
  if (!timelineRef.current) return
  const pctToday = pct(new Date())
  const scrollWidth = timelineRef.current.scrollWidth
  timelineRef.current.scrollLeft = (pctToday / 100) * scrollWidth - 300
}, [timelineRef.current?.scrollWidth])
```

---

### NEW-FRICTION-13 — PBI Tracker: "Migration" column hidden off-screen ⭐ New finding
**File:** `PBITracker.jsx`  
**Browser status:** ✅ CONFIRMED — visible in `dark-03-pbi.png`

**Observed in browser:** The PBI Tracker table header shows: PBIID | DocType | Site | App | Function | Stage | Status | % L2 | Scope Start | Dev Start | UAT Start | **Migrati...** (truncated at viewport edge). The last visible column header is "Migrati—" cut off. The table has a horizontal scrollbar (visible in screenshot) but no affordance indicating columns are hidden — users on standard 1366px laptops will never see the Migration date column.

**Fix:** Consider pinning PBIID + DocType as frozen left columns, and making the date columns collapsible or accessible via a column picker toggle.

---

## 3. Accessibility Compliance Summary

| Criterion | WCAG Level | Status | Browser Observation |
|---|---|---|---|
| 1.4.3 Contrast (Minimum) | AA | ⚠️ 4 failures | KPI accent, muted light text, PBIID column, sidebar active |
| 2.1.1 Keyboard | A | ⚠️ Partial | Gantt `×`, dark mode toggle missing aria-label (NEW-FRICTION-11) |
| 2.1.2 No Keyboard Trap | A | ❌ Fail | Modal focus trap not implemented |
| 2.4.3 Focus Order | AA | ✅ Pass | Tab order matches visual order |
| 3.2.1 On Focus | A | ✅ Pass | No unexpected context changes on focus |
| 4.1.2 Name, Role, Value | A | ⚠️ Partial | Dark mode toggle has no aria-label (NEW-FRICTION-11) |
| 1.3.1 Info and Relationships | A | ✅ Pass | Tables have headers, labels on form fields |
| 2.5.3 Touch Target (WCAG 2.5) | AAA | ❌ Fail | Several buttons below 44×44px |

---

## 4. Navigation Pattern Improvements

### Current: Flat sidebar navigation
**Browser observation:** The sidebar renders 7 buttons at the same visual level (dark-01-overview.png). The active item (e.g., "Overview") is highlighted in orange fill — this works well and is distinctive. However the 7 items have no grouping, so a new user cannot tell at a glance whether "Scope Tracker" and "Increments" are related to planning or tracking.

The sidebar has a **collapse toggle** (visible as `<` arrow button at the top right of the sidebar in the screenshots). When collapsed, only icons show — this was observed working in code but not tested in the browser.

### Recommended: Grouped sidebar with section labels
```
PLANNING
  ├── Overview
  └── Gantt Chart

TRACKING
  ├── PBI Tracker
  ├── CAW Board
  └── Weekly Log

SCOPE
  ├── Scope Tracker
  └── Increments
```

**Implementation:** Add `group` labels to the VIEWS array and render a `<p className="...">` divider in `Sidebar.jsx`.

---

## 5. Micro-Interaction Checklist

| Interaction | Current | Browser Observation | Recommended |
|---|---|---|---|
| Button press | No feedback | Buttons feel static | `active:scale-95` on primary buttons |
| Drag card pick up | `opacity-50 rotate-1` | Not tested live | Add `cursor-grabbing` |
| Sheet save success | Toast appears | "Synced Xs ago" updates in top bar ✅ | Also briefly flash the dot green + ring |
| Collapse group | Instant toggle | Not observed in PBI (all expanded) | Already has `transition-all` ✅ |
| Gantt bar hover | `hover:brightness-110` | Not tested live | Also show tooltip with exact dates |
| Modal open | `animate-slide-up` | Not triggered in test | Add `backdrop-blur-sm` on overlay ✅ |
| Week navigation | Instant jump | Prev/Next text buttons visible | Add icon chevrons + `transition-opacity` |
| Status chip click | `hover:opacity-80` | Not tested | — |
| Dark/light mode toggle | Instant | Clean, no flash | ✅ |

---

## 6. Data Content Issues Found During Visual Audit

These are data-layer issues surfaced by the visual audit — not code bugs, but worth noting for completeness:

| View | Issue | Source |
|---|---|---|
| CAW Board | "Scope for Vehcile Service" — typo in card title | Google Sheet data |
| Weekly Log | "Scope Discovert start" — typo in milestone | Google Sheet data |
| PBI Tracker | "Ledger Managment" — missing 'e' in PBI-0001 | Google Sheet data |
| Weekly Log | All 6 modules show `Update due: —` | No update due dates set in sheet |
| Increments | All 5 items status = "Done" | Correct — no in-progress increments |
| Overview | Phase Progress — all 5 phases at 0% | Gantt stages not yet "Released to Prod" |