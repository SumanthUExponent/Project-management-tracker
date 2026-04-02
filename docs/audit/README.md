# ERP Tracker — UI Audit Index
**App:** ERP Tracker — Exponent Energy  
**Audit Date:** 2026-04-02  
**Audit Method:** Live browser testing via Chrome DevTools MCP + source code analysis  
**Views tested:** All 7 — Overview, Gantt Chart, PBI Tracker, CAW Board, Weekly Log, Scope Tracker, Increments  
**Modes tested:** Dark mode (default) and light mode  
**Screenshots:** `screenshots/` — 14 images (dark-01 to dark-07, light-01 to light-07)

---

## Documents

| # | Document | Lens | Key Findings |
|---|---|---|---|
| 01 | [Visual Design Evolution](01-visual-design-evolution.md) | Aesthetics, branding, contrast | 9 bugs (5 confirmed by browser, 4 new) |
| 02 | [UX Interaction Strategy](02-ux-interaction-strategy.md) | Usability, friction, accessibility | 13 friction points (10 original, 3 new) |
| 03 | [Functional Business Logic Roadmap](03-functional-business-logic-roadmap.md) | Feature completeness, write-back | 6 stubs broken, 5 Gantt enhancements roadmapped |

---

## Screenshot Index

| Filename | View | Mode |
|---|---|---|
| `dark-01-overview.png` | Overview | Dark |
| `dark-02-gantt.png` | Gantt Chart | Dark |
| `dark-03-pbi.png` | PBI Tracker | Dark |
| `dark-04-caw.png` | CAW Board | Dark |
| `dark-05-weekly.png` | Weekly Log | Dark |
| `dark-06-scope.png` | Scope Tracker | Dark |
| `dark-07-increments.png` | Increments | Dark |
| `light-01-overview.png` | Overview | Light |
| `light-02-gantt.png` | Gantt Chart | Light |
| `light-03-pbi.png` | PBI Tracker | Light |
| `light-04-caw.png` | CAW Board | Light |
| `light-05-weekly.png` | Weekly Log | Light |
| `light-06-scope.png` | Scope Tracker | Light |
| `light-07-increments.png` | Increments | Light |

---

## Top Priority Fixes — All Documents Combined

### Fix Immediately (P0 / trivial effort)
| # | Issue | File | Effort |
|---|---|---|---|
| 1 | "All Statuss" typo in PBI filter | `PBITracker.jsx` | 2 min |
| 2 | PBIID column contrast fail in light mode | `PBITracker.jsx` | 5 min |
| 3 | Raise muted `text-gray-400` → `text-gray-500` in light mode | Global | 15 min |

### Fix This Week (P0 — unblocks write functionality)
| # | Issue | File | Effort |
|---|---|---|---|
| 4 | Add `append` mode to `useSave.js` | `useSave.js` | 1–2 hrs |
| 5 | Weekly Log: wire `handleStartNewWeek` to `append` | `WeeklyLog.jsx` | 1 hr |
| 6 | Weekly Log: wire save button to `save()` call | `WeeklyLog.jsx` | 30 min |

### Fix Next Sprint (P1 — high value, low effort)
| # | Issue | File | Effort |
|---|---|---|---|
| 7 | Gantt: auto-scroll to today on mount + Today button | `GanttView.jsx` | 30 min |
| 8 | PBI Tracker: default all groups to collapsed | `PBITracker.jsx` | 15 min |
| 9 | Add `shadow-card` to all flat panels in light mode | 5 view files | 30 min |
| 10 | Modal: add keyboard focus trap | `Modal.jsx` | 30 min |
| 11 | Dark mode toggle: add `aria-label` | `Sidebar.jsx` | 5 min |

---

## Live Data State (Wk-14, Apr 2026)

- 39 active modules, 5 phases, 0% released to prod
- 131 PBIs — all Phase 1 modules in Sustenance
- 20 CAW items: 7 Open, 7 In Progress, 1 Stuck, 5 Completed
- 6 modules in Weekly Log — all Ongoing
- 5 Increments — all Done
- Google Sheets connection: ✅ Live
- Authentication: Read-only (public), Write requires Google sign-in

---

## Audit Methodology Notes

All visual bugs in this audit were verified in a live browser (Chrome, 1536×768px viewport) using the Chrome DevTools MCP. Where code analysis predicted a bug that was less severe in practice (e.g., BUG-V3 CAW Stuck border), the document notes the discrepancy. New bugs not predicted by static analysis are marked **⭐ New finding**.

Data content issues (sheet typos like "Vehcile Service", "Ledger Managment") are noted in Doc 02 Section 6 but are not code bugs — they must be corrected in the Google Sheet directly.