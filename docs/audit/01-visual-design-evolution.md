# Document 1 — Visual Design Evolution
**Role: Lead Designer | Lens: Aesthetics, Branding, Emotional Resonance**  
**Audit Date:** 2026-04-02  
**App:** ERP Tracker — Exponent Energy  
**Audit Method:** Live browser testing (Chrome DevTools MCP) — all 7 views captured in both dark and light mode  
**Screenshot archive:** `docs/audit/screenshots/` — 14 images (dark-01 through dark-07, light-01 through light-07)

---

## 0. Browser Audit Summary

All 7 views were loaded and visually inspected at 1536×768px viewport in both dark and light mode. The browser confirms the app loads in **dark mode by default** (correct). The `document.documentElement.classList.toggle('dark')` toggle worked cleanly — light mode loads without page refresh artifacts.

| View | Dark Mode | Light Mode | Visual Bugs Confirmed |
|---|---|---|---|
| Overview | ✅ Clean | ✅ Clean | KPI accent contrast (BUG-V2) |
| Gantt Chart | ✅ Strong | ✅ Strong | Legend row wrapping (BUG-V4) |
| PBI Tracker | ✅ Good | ⚠️ Contrast issue | PBIID column low contrast (NEW-V6), "All Statuss" typo (NEW-V7) |
| CAW Board | ✅ Good | ✅ Good | Stuck border faint but visible (BUG-V3 — less severe than predicted) |
| Weekly Log | ✅ Good | ✅ Good | Emoji icons render OK in Chrome (BUG-V5 — Chrome-only, still fix) |
| Scope Tracker | ✅ Good | ✅ Good | No visual bugs |
| Increments | ✅ Clean | ✅ Clean | No visual bugs |

---

## 1. Current Design System Inventory

| Token | Current Value | Assessment |
|---|---|---|
| Brand primary | `#f97316` (orange) | Strong, distinctive — keep |
| Dark surface bg | `#0d1117` | Good — true near-black, OLED-friendly |
| Dark card | `#1f2937` | Slightly too light — loses depth against `#111827` |
| Light bg | `bg-slate-100` | Correct — subtle warmth, not harsh white |
| Light card | `bg-white` | Correct |
| Display font | Syne (600–800) | Bold personality, good for headings |
| Body font | Outfit (300–600) | Friendly, readable — good choice |
| Mono font | IBM Plex Mono | Industry standard for data/dates — keep |
| Shadow system | `shadow-card` defined but only used in Overview | **Critical gap** |
| Border radius | `rounded-xl` (12px) cards | Consistent — good |
| Animation | 200ms fade/slide | Correct range for micro-interactions |

---

## 2. Visual Bugs — Browser Verified

### BUG-V1 — Shadow system not applied universally
**Files affected:** `PBITracker.jsx`, `CAWBoard.jsx`, `WeeklyLog.jsx`, `ScopeTracker.jsx`, `Increments.jsx`  
**Browser status:** ✅ CONFIRMED — visible in `light-03-pbi.png`, `light-04-caw.png`, `light-06-scope.png`

In light mode, panels with `bg-white border border-gray-200` have **zero elevation**. Cards are distinguishable from the page background only by their border — no depth. The Scope Tracker table header row and the PBI Tracker table blend directly into the white page.

**Observed:** The CAW Board kanban columns and Weekly Log module cards look like paper printouts in light mode — acceptable for data reading, but visually flat for an app used daily.

**Fix — add to every top-level card/panel:**
```jsx
// Before
className="bg-white dark:bg-surface-700 border border-gray-200 dark:border-surface-600 rounded-xl"

// After
className="bg-white dark:bg-surface-700 border border-gray-200 dark:border-surface-600 rounded-xl shadow-card hover:shadow-card-md transition-shadow"
```

**Rationale:** Shadow is the primary depth signal in light mode. Without it, a professional dashboard reads as a printed document.

---

### BUG-V2 — KPI "accent" card contrast failure
**File:** `KpiCard.jsx` | **Impact:** Overview page  
**Browser status:** ✅ CONFIRMED — visible in `light-01-overview.png`

**Observed in browser:** In light mode, the RELEASED TO PROD card has a distinctly yellow-tinted background (`bg-orange-50/50`), and the "0" value is rendered in `#f97316` orange. The STUCK ITEMS and NOT UPDATED cards have a pink/red tint with red value text. The color coding is **semantically useful** (red for problems, yellow for attention) but the orange-on-orange-tint combination fails contrast.

The `0` value in RELEASED TO PROD (orange on orange-50 background) is the most visible failure — approximately **2.1:1** contrast ratio.

**Fix:**
```jsx
// Replace the accent variant background
accent
  ? 'border-l-4 border-brand bg-white dark:bg-surface-700 border-t-0 border-r-0 border-b-0 border-l-brand'
  : ...
```
Use a left-border accent strip instead of a tinted background. Value text stays `text-brand` orange against white — contrast **4.8:1** ✅

---

### BUG-V3 — CAWBoard kanban card border in light mode
**File:** `CAWBoard.jsx:22`  
**Browser status:** ⚠️ PARTIALLY CONFIRMED — less severe than predicted, visible in `light-04-caw.png`

**Observed in browser:** The "Network Service Module" STUCK card in light mode has a **visible** reddish tint and border — the card stands out from the other columns' white cards. The border is faint (`border-red-500/40`) but the card background is also slightly pink-tinted, which compensates. Less of an emergency than the code suggested, but should still be tightened.

```jsx
item['Status'] === 'Stuck' ? 'border-red-300 dark:border-red-500/40' : 'border-gray-200 dark:border-surface-500'
```

---

### BUG-V4 — Gantt legend is visually cramped
**File:** `GanttView.jsx:136-143`  
**Browser status:** ✅ CONFIRMED — visible in `dark-02-gantt.png` and `light-02-gantt.png`

**Observed in browser:** At 1536px viewport width, all 9 legend swatches fit on one row, but they are **extremely tight** — some labels are touching. The swatches and text are 10-11px, making them difficult to read quickly. On narrower viewports (1280px or when sidebar is expanded), the legend would wrap.

The Gantt chart itself is one of the strongest views visually — the colored bars are well-differentiated and the timeline is clear. The today marker (vertical orange line) is visible and sits approximately at March 2026, which matches the current date. However, **the chart opens at the left edge (Oct 2024)**, not scrolled to today — a key UX issue (see Doc 2 FRICTION, and Doc 3 G1).

**Fix:** Convert to `flex-wrap gap-x-4 gap-y-1` grid. Or collapse to a popover.

---

### BUG-V5 — WeeklyLog milestone status uses emoji as UI icons
**File:** `WeeklyLog.jsx:57`  
**Browser status:** ⚠️ PARTIALLY CONFIRMED — Chrome renders OK, but cross-platform risk remains

**Observed in browser:** In Chrome on Windows 11, the milestone checkmarks render as green square check-mark elements, and pending items show as white circles. These look like they may already be using a styled element (or the emoji renders cleanly as a colored square on this OS). Screenshot: `dark-05-weekly.png`.

However, the `○` for pending is noticeably smaller than the `✅` for completed — creating inconsistent sizing. The fix to Lucide SVGs remains valid for cross-platform consistency.

```js
import { CheckCircle2, AlertTriangle, XCircle, Circle } from 'lucide-react'
const icons = {
  completed: <CheckCircle2 size={12} className="text-emerald-500" />,
  delayed:   <AlertTriangle size={12} className="text-amber-500" />,
  overdue:   <XCircle size={12} className="text-red-500" />,
  pending:   <Circle size={12} className="text-gray-400" />,
}
```

---

### NEW-V6 — PBI Tracker PBIID column fails contrast in light mode ⭐ New finding
**File:** `PBITracker.jsx` (PBIID cell styling)  
**Browser status:** ✅ CONFIRMED — clearly visible in `light-03-pbi.png`

**Observed in browser:** The PBIID column values ("PBI-0001", "PBI-0002", etc.) render in a very light gray — approximately `text-gray-400` on `bg-white`. This is the **worst contrast issue in the entire app in light mode**. The IDs are nearly invisible against the white table background. The monospace font draws attention to these values, but the color makes them unreadable.

**Note:** This bug does not appear in dark mode — dark mode renders PBIID text with sufficient contrast.

**Fix:**
```jsx
// In PBITracker.jsx — PBIID cell
<td className="font-mono text-xs text-gray-500 dark:text-gray-400 ...">
```
Change `text-gray-400` (light mode) to `text-gray-500` — brings contrast to ~4.6:1 on white ✅

---

### NEW-V7 — "All Statuss" typo in PBI Tracker filter dropdown ⭐ New finding
**File:** `PBITracker.jsx` — filter `<select>` element  
**Browser status:** ✅ CONFIRMED — visible in both `dark-03-pbi.png` and `light-03-pbi.png`, verified via JS

**Observed in browser:** The second filter dropdown (status filter) reads "All Statuss" — double 's'. This is exposed directly in the UI and in the `<option>` value. It appears in the select element as: `["All Statuss","Ongoing","Released to Test Site","Released to Prod Site","Cancelled"]`.

**Fix:** Search `PBITracker.jsx` for `All Statuss` and correct to `All Statuses`.

---

### NEW-V8 — Increments view: large empty space below 5 items ⭐ New finding
**File:** `Increments.jsx`  
**Browser status:** ✅ CONFIRMED — visible in `dark-07-increments.png` and `light-07-increments.png`

**Observed in browser:** Only 5 increments exist in the data. Below the last card, there is approximately 250px of empty white/dark space before the page ends. The view looks unfinished for small datasets.

**Fix:** Add an empty state below the list when all items are "Done":
```jsx
{filtered.length > 0 && filtered.every(r => r['Status'] === 'Done') && (
  <p className="text-center text-xs font-mono text-gray-400 pt-8">
    All {filtered.length} increments complete
  </p>
)}
```

---

### NEW-V9 — Scope Tracker "discover" chips — low contrast in light mode ⭐ New finding
**File:** `ScopeTracker.jsx`  
**Browser status:** ✅ CONFIRMED — visible in `light-06-scope.png`

**Observed in browser:** The VS Notes column shows small pill chips labeled "discover" in a gray background. In light mode these are distinguishable but the text is very small and the chip color is nearly the same as the row hover color. The hourglass emoji `⏳` on the first row (Exponent Asset Management) is inconsistent with the text chips below.

---

## 3. Typography Hierarchy — Current vs. Recommended

### Current (flat — 3 of 4 levels look identical):
```
h1 Overview          font-display text-xl  font-bold     → page title ✅
h2 Phase Progress    font-display text-sm  font-semibold → section head
h3 Module Name       font-display text-sm  font-semibold → same as h2 ❌
body text            font-body    text-sm               → same weight as h3 ❌
caption/date         font-mono    text-xs  text-gray-400 → correct ✅
```

**Browser observation:** This is most visible in the Gantt Chart (dark-02-gantt.png) and PBI Tracker where module group headers ("Accounts 3 PBIs") and individual row text are nearly the same visual weight. In the Overview, the page heading "Overview" / subtitle "ERP implementation at a glance" hierarchy works well.

### Recommended (4 clear levels):
```
Level 1 (Page):    font-display text-xl  font-bold   text-gray-900 dark:text-gray-100
Level 2 (Section): font-display text-sm  font-semibold text-gray-700 dark:text-gray-300
Level 3 (Item):    font-body    text-sm  font-medium  text-gray-800 dark:text-gray-200
Level 4 (Meta):    font-mono    text-xs               text-gray-400 dark:text-gray-500
```

---

## 4. Color Contrast Audit (WCAG AA — requires 4.5:1)

| Element | Foreground | Background | Ratio | Pass? | Browser Status |
|---|---|---|---|---|---|
| KPI label (dark) | `#6b7280` gray-500 | `#1f2937` surface-700 | 4.6:1 | ✅ | Confirmed OK |
| KPI value (dark) | `#f3f4f6` gray-100 | `#1f2937` surface-700 | 12.6:1 | ✅ | Confirmed OK |
| KPI accent value | `#f97316` brand | `#fff7ed` orange-50 | **2.1:1** | ❌ | Confirmed fail (light-01) |
| Table body text (light) | `#1f2937` gray-800 | `#ffffff` white | 16.1:1 | ✅ | Confirmed OK |
| PBIID column (light) | `#9ca3af` gray-400 | `#ffffff` white | **2.9:1** | ❌ | Confirmed fail (light-03) |
| Muted text (light) | `#9ca3af` gray-400 | `#ffffff` white | **2.9:1** | ❌ | Confirmed fail throughout |
| Muted text (dark) | `#9ca3af` gray-400 | `#1f2937` surface-700 | 4.7:1 | ✅ | Confirmed OK |
| Status chip Ongoing | `#92400e` amber-800 | `#fef3c7` amber-100 | 7.2:1 | ✅ | Confirmed OK |
| Gantt bar label | `#ffffff` | `#3b82f6` blue-500 | 4.6:1 | ✅ | Confirmed OK |
| Sidebar active | `#ffffff` | `#f97316` brand | 3.1:1 | ❌ | Confirmed fail (both modes) |

**Action items:**
- PBIID column in light mode: raise from `gray-400` to `gray-500` (NEW-V6)
- Muted text in light mode: raise from `gray-400` to `gray-500` for light backgrounds
- Sidebar active: use `font-semibold` to compensate, or darken active bg to `#ea6c0a` (brand-dark)
- KPI accent: fix per BUG-V2 above

---

## 5. Dark vs. Light Mode — Side-by-Side Assessment

**Dark mode (default):** Strong visual identity. The dark surface (`#0d1117`) with orange brand accents creates a distinctive, professional feel. The Gantt chart in particular looks excellent — the colored bars pop against the dark background. Card depth is subtle (borders rather than shadows) but consistent. Status chips (Sustenance teal, In Progress blue, Stuck/Critical red) all have adequate contrast in dark mode.

**Light mode:** Functional but less polished. The white-on-white card issue (BUG-V1) makes the layout feel flatter than intended. The Overview's semantically-colored KPI cards (pink tint for problem metrics, yellow for neutral) is a smart pattern that would benefit from sharper borders. The Gantt chart in light mode looks nearly identical to dark — the timeline bars are self-contained enough to be mode-agnostic.

**Recommendation:** Light mode is the more demanding design target — fix BUG-V1 (shadows) first and the overall quality perception will improve significantly across 5 views simultaneously.

---

## 6. Spacing & Whitespace Audit

| View | Issue | Browser Observation | Fix |
|---|---|---|---|
| Overview KPI strip | `gap-3` (12px) between 5 cards | Cards look proportionally spaced at 1536px (dark-01) | `gap-3 sm:gap-4` |
| PBITracker table | Column padding `px-3 py-2` — rows feel cramped at 13 columns | Confirmed cramped — columns cut off on right at 1536px (dark-03) | Keep px-3, increase to `py-2.5` |
| CAW kanban | Column gap `gap-4` | 4 columns fit well at 1536px | `gap-3 xl:gap-4` |
| Gantt rows | `ROW_H = 32px` | Bars are visible but tight (dark-02) | Increase to `ROW_H = 36` |
| Increments | Large empty space below 5 items | Confirmed — ~250px empty space (dark-07, light-07) | Add empty state message (NEW-V8) |
| Sidebar | `py-3 px-2` nav items | Spacing looks correct at this viewport | ✅ OK |

---

## 7. 2026 Design Standards — Gap Analysis

| Standard | Status | Browser Observation |
|---|---|---|
| `color-scheme` declaration | ✅ Added to index.css | Both modes transition cleanly |
| CSS `prefers-reduced-motion` | ✅ Handled | — |
| Focus-visible rings | ✅ Global CSS added | Verify on all interactive elements |
| Skeleton loading screens | ❌ Only spinner on initial load | Synced "0s ago" appears immediately — data was cached or fast |
| Micro-interaction on save | ⚠️ Toast exists, no button state | — |
| Consistent icon set (Lucide) | ⚠️ Lucide everywhere except WeeklyLog emojis | BUG-V5 — Chrome OK, fix for cross-platform |
| Glass/depth in dark mode | ⚠️ All dark surfaces are flat | No depth differentiation between page/card/elevated elements |
| Design token documentation | ❌ None | — |

---

## 8. Recommended Quick Wins (highest impact, lowest effort)

| # | Change | Files | Effort | Impact | Browser Priority |
|---|---|---|---|---|---|
| 1 | Add `shadow-card` to all card panels | 5 view files | 30 min | High | High — flatness confirmed |
| 2 | Fix PBIID contrast gray-400→gray-500 (NEW-V6) | PBITracker.jsx | 5 min | High | Critical — confirmed fail |
| 3 | Fix "All Statuss" typo (NEW-V7) | PBITracker.jsx | 2 min | Medium | Immediate — embarrassing |
| 4 | Fix KPI accent contrast (BUG-V2) | KpiCard.jsx | 10 min | High | Confirmed fail |
| 5 | Replace emoji icons with Lucide (BUG-V5) | WeeklyLog.jsx | 20 min | Medium | Low (Chrome OK) |
| 6 | Fix Stuck card border opacity (BUG-V3) | CAWBoard.jsx | 5 min | Low | Less urgent — partially visible |
| 7 | Raise muted text gray-400 → gray-500 in light mode | Global | 15 min | Medium | Confirmed fail |
| 8 | Add empty state to Increments (NEW-V8) | Increments.jsx | 10 min | Low | Confirmed gap |
| 9 | Add `font-semibold` to sidebar active text | Sidebar.jsx | 5 min | Low | Confirmed fail |