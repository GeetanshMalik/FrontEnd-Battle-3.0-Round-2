# 🛰️ PHASE 2 — HIGH-DENSITY ENTERPRISE RPA MONITOR
## Rules, Architecture & Full Build Plan (v3 — Final)

> **Competition Date:** 28 June 2026 | **Deadline:** 10:00 PM IST  
> **Stack Constraint:** 100% Client-Side · No Server · No External Grid Libraries

---

## PART 1 — WHAT WE ARE BUILDING

### The Mission
A **High-Density Enterprise Control Terminal** that ingests a continuous 200ms real-time telemetry stream of RPA (Robotic Process Automation) project data and renders it at locked 60 FPS — with zero frame drops, zero memory leaks, and full interactive control across sorting, filtering, searching, and layout persistence.

### The Dataset
The provided `automation_projects.csv` (50,000 rows, 18 columns) is pre-loaded into memory by `dataStream.js`. The pipeline mutates clones of these rows every 200ms and fires them to our callback as `incomingBatch[]` arrays.

> ⚠️ `incomingBatch` contains **updates to existing rows**, not new rows. The stream mutates a fixed pool of 50,000 records. Always upsert, never push.

**Column Schema:**

| Column | Type | Role |
|---|---|---|
| `project_id` | String | Unique identifier |
| `company_id` | String | Parent company |
| `project_name` | String | Display name — fuzzy search target |
| `start_date` | String | ISO date |
| `completion_date` | String | ISO date (nullable) |
| `project_status` | String | `Active`, `Completed`, `Failed` — alert trigger |
| `automation_type` | String | Categorical filter target |
| `robots_deployed` | Integer | KPI input — running sum |
| `budget_usd` | Integer | Currency field — must be locale-formatted |
| `annual_savings_usd` | Integer | **Primary KPI** — cumulative sum |
| `roi_percent` | Float | Percentage — clamp to 2dp, alert if negative |
| `department` | String | Categorical filter target |
| `implementation_partner` | String | Fuzzy search target |
| `country` | String | Fuzzy search target |
| `industry` | String | Categorical filter target |
| `employee_hours_saved` | Integer | Numeric — sort target |
| `ai_enabled` | String | `Yes` / `No` |
| `cloud_deployment` | String | `Yes` / `No` |

---

## PART 2 — THE 10 SCORING MODULES (100 POINTS TOTAL)

### Feature 1 — High-Density KPI Dashboard *(10 pts)*
Three top-row live metric counters:
- **Total Streamed Rows Processed** — running count of every row received across all batches
- **Active Robots Deployed Count** — running sum of all `robots_deployed` values received
- **Global Cumulative Savings** — running sum of all `annual_savings_usd` values received

Must update every 200ms tick. KPI strip is an isolated render zone — stream updates must NOT cause KPI re-renders to cascade into the grid or toolbar.

### Feature 2 — Financial & Numeric Value Sanitation *(10 pts)*
- `budget_usd` and `annual_savings_usd` → locale-formatted with commas (e.g., `$1,069,470`)
- `roi_percent` → clamped to 2 decimal places (e.g., `54.20%`)
- Zero raw string leakage into the DOM under rapid updates

### Feature 3 — Visual System Alert & Status Indicators *(10 pts)*
- Rows with `project_status === 'Failed'` flash a warning background hue
- Rows where `roi_percent < 0` (anomaly injected by dataStream) also flash
- Flash animation uses CSS `@keyframes` that auto-expire and clear without layout thrash
- Alerts must NOT cause parent component re-renders — class toggled via direct DOM ref

### Feature 4 — Single-Column Telemetry Sorter *(10 pts)*
- Clickable column headers for `budget_usd`, `roi_percent`, `employee_hours_saved`
- Click cycles: Ascending → Descending → Unsorted
- Sort order must survive incoming 200ms ticks — computed in Worker, not main thread

### Feature 5 — Pipeline Buffer Control (Pause / Play) *(10 pts)*
- **Pause:** UI display locks completely. Internal state engine continues buffering incoming batches.
- **Play:** Flush entire queued buffer to state engine seamlessly — no skipped or duplicated rows.
- Stream state machine governs transitions (see Part 4 — State Machine).
- Visual overlay indicates Paused status with queue length counter.

### Feature 6 — Operator Workspace Layout Persistence *(10 pts)*
- Users can toggle visibility of layout panels: KPI strip, Data Grid, Analytics Chart, Filter Bar
- Visibility preferences saved to `localStorage`
- Hard refresh must restore exact panel visibility states
- Each panel toggle must re-render only that panel — not the whole app

### Feature 7 — Categorical Dropdown Filters *(10 pts)*
- Multi-choice dropdown filters for `automation_type`, `department`, `industry`
- Selecting a value instantly narrows the visible grid rows to matching records only
- Filter state is isolated — incoming stream mutations must not reset active filter selections

### Feature 8 — High-Frequency Virtualized DOM Grid *(15 pts)*
- Live view-pool of 500+ concurrent rows
- **No external virtualization libraries** — `VirtualGrid.jsx` is our own hand-rolled implementation
- DOM contains only a fixed count of `<tr>` nodes = `Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN`
- On scroll: compute `startIndex`, swap `.textContent` of recycled nodes directly — no React re-render
- All DOM mutations gated through `requestAnimationFrame` → locked 60 FPS

> `VirtualGrid.jsx` is the name of **our own component**. It does not use or reference `react-window`, `react-virtualized`, or any banned package. The naming is intentional — it describes the rendering technique (DOM virtualization) we built from scratch.

### Feature 9 — Multi-Column Concurrent Sorter *(10 pts)*
- Shift+Click on column headers to add secondary, tertiary sort keys
- Example: sort `industry` alphabetically → sub-sort `roi_percent` descending
- Compound sort tree computed in Web Worker within the 200ms delivery window, no UI lock

### Feature 10 — Multi-Field Fuzzy Search Engine *(5 pts)*
- Search bar parses partial, out-of-order keyword tokens simultaneously
- Targets: `project_name`, `company_id`, `implementation_partner`, `country`
- Example: `"Tata Fin Cloud"` matches rows containing all three tokens across any of those fields
- Input debounced 100ms, search executed in Web Worker — zero main-thread blocking

---

## PART 3 — THE RULES (STRICT CONSTRAINTS)

### ✅ WHAT WE CAN DO

- Use **React + Vite** as our framework (single-page, 100% client-side static bundle)
- Load `dataStream.js` via `<script src="/dataStream.js">` in `index.html`
- Use the `window.initializeRpaStream(callback, csvUrl)` global hook exactly as documented
- Place `automation_projects.csv` in the `/public/` directory for native `fetch()` resolution
- Build our own row virtualization engine from scratch using raw DOM APIs and `requestAnimationFrame`
- Use `localStorage` for Feature 6 layout persistence
- Use CSS custom properties, `@keyframes` animations, and transitions for visual effects
- Use **Web Workers** for sort, filter, and search computation to keep the main thread free
- Use `React.memo`, `useMemo`, `useCallback`, stable refs, and `useSyncExternalStore` for render isolation
- Deploy to Vercel, Netlify, or GitHub Pages (all produce public static deployments)
- Maintain a **public** GitHub repository with a modular, multi-file codebase

### ❌ WHAT IS PROHIBITED

**Library Blacklist — Instant Disqualification:**
- `AG-Grid` — forbidden
- `TanStack Table` / `React Table` — forbidden
- `react-window` — forbidden
- `react-virtualized` — forbidden
- Any pre-built data grid, virtualization utility, or table component package — forbidden

**Architecture Prohibitions:**
- **No server-side code.** All logic executes in the browser only. No Node.js endpoints, Express routes, API handlers, or SSR execution paths of any kind.
- No private GitHub repositories
- No authentication-gated deployments — live URL must open with zero login
- **No single-file dump** — codebase must be modular and organized across multiple files (explicit DQ criterion in the spec)
- No plagiarized or copied submissions

**Operational Prohibitions:**
- Do not modify `dataStream.js` — it is a black box provided by the hackathon
- Do not load the CSV via any path other than the `csvUrl` parameter in `initializeRpaStream`
- Do not call `initializeRpaStream` more than once (engine blocks re-initialization with a warning)
- Do not block the main thread for sort, search, or filter — offload to Web Worker
- Do not allow memory growth — pool is capped at 50,000 entries via Map upsert, never push
- Do not allow raw unformatted numbers to render in the DOM (Feature 2 violation)

**Submission Prohibitions:**
- Missing GitHub link → disqualified
- Missing live deployment link → disqualified
- Missing illustration/walkthrough video → disqualified
- Deployment broken or unusable during evaluation → disqualified
- GitHub repo not matching the deployed application → disqualified

---

## PART 4 — FULL PROJECT ARCHITECTURE (v2)

### Tech Stack
**React 18 + Vite** — single-page application, fully client-side static bundle.

React 18's concurrent features give us batched state updates out of the box. Vite produces a zero-config static build deployable to Vercel/Netlify in one command.

> ⚠️ **Do NOT use React Context for stream data.** Context triggers a full subtree re-render on every value change. At 200ms ticks this causes cascading re-renders across the entire app. Instead use `useSyncExternalStore` — React 18's built-in hook designed specifically for high-frequency external data sources. Components subscribe directly to the slices they care about and re-render only when those slices change.

```js
// How components subscribe to the external store
const visibleRows = useSyncExternalStore(
  computeWorker.subscribe,   // subscribe to Worker result events
  computeWorker.getSnapshot  // return latest sorted+filtered array
);
```

---

### Master Architecture Diagram

```
                     dataStream.js  (Black Box — Do Not Touch)
                            │
                            │  incomingBatch[]  every 200ms
                            ▼
                      StreamBridge.js
                            │
                     Event Dispatcher
                            │
          ┌─────────────────┼──────────────────┐
          ▼                 ▼                  ▼
    PauseQueue.js     StateEngine.js     MetricsEngine.js
    (Feature 5)       Map<uid, row>      (KPI accumulators)
                            │
                    Derived Selectors
                            │
          ┌─────────────────┼──────────────────┐
          ▼                 ▼                  ▼
   computeWorker.js  (Web Worker — off main thread)
          │
     Filter → Search → Sort  (pipeline in Worker)
          │
          ▼
    VirtualGrid.jsx     KPIStrip.jsx     AlertSystem.jsx
    (hand-rolled        (isolated        (DOM class
     row recycler)       render zone)     toggling only)
          │
    Fixed N <tr> nodes in DOM
    Content-swapped on scroll via RAF
```

---

### Directory Structure

```
rpa-monitor/
├── public/
│   ├── automation_projects.csv      ← Official hackathon dataset (root-accessible via fetch)
│   └── dataStream.js                ← Official pipeline engine (black box — do not modify)
│
├── src/
│   ├── main.jsx                     ← React 18 createRoot entry point
│   ├── App.jsx                      ← Root layout orchestrator + panel visibility gate
│   │
│   ├── engine/
│   │   ├── streamBridge.js          ← Calls initializeRpaStream, dispatches events to bus
│   │   ├── eventBus.js              ← Lightweight pub/sub event dispatcher
│   │   ├── stateEngine.js           ← Map<uid, row> upsert pool (max 50k entries)
│   │   ├── metricsEngine.js         ← Running KPI accumulators (rows, robots, savings)
│   │   ├── streamStateMachine.js    ← INITIALIZING → LOADING → STREAMING → PAUSED → RESUMING → ERROR
│   │   └── pauseQueue.js            ← Batch buffer during PAUSED state
│   │
│   ├── workers/
│   │   └── computeWorker.js         ← Web Worker: filter → search → sort pipeline (off main thread)
│   │
│   ├── selectors/
│   │   ├── selectVisibleRows.js     ← Derived: filtered + searched + sorted row array
│   │   ├── selectKPIs.js            ← Derived: current KPI snapshot from metricsEngine
│   │   ├── selectAlerts.js          ← Derived: rows with Failed status or negative ROI
│   │   └── selectFilterOptions.js   ← Derived: unique values for dropdown population
│   │
│   ├── components/
│   │   ├── KPIStrip/
│   │   │   └── KPIStrip.jsx         ← Feature 1: three isolated live counter cards
│   │   │
│   │   ├── VirtualGrid/
│   │   │   ├── VirtualGrid.jsx      ← Feature 8: hand-rolled virtualized table (our own code)
│   │   │   ├── GridRow.jsx          ← Single recycled <tr> node with direct DOM ref
│   │   │   └── useVirtualScroll.js  ← Custom hook: viewport math + RAF-gated content swap
│   │   │
│   │   ├── SortHeader/
│   │   │   └── SortHeader.jsx       ← Feature 4 + 9: click / shift-click column headers
│   │   │
│   │   ├── FilterBar/
│   │   │   └── FilterBar.jsx        ← Feature 7: multi-choice categorical dropdowns
│   │   │
│   │   ├── SearchBar/
│   │   │   └── SearchBar.jsx        ← Feature 10: debounced fuzzy multi-token input
│   │   │
│   │   ├── PauseControl/
│   │   │   └── PauseControl.jsx     ← Feature 5: Pause/Play button + queue-length overlay
│   │   │
│   │   ├── LayoutManager/
│   │   │   └── LayoutManager.jsx    ← Feature 6: panel toggle + localStorage persistence
│   │   │
│   │   └── PerformanceMonitor/
│   │       └── PerformanceMonitor.jsx ← Debug overlay: FPS, heap MB, queue depth, rows/sec
│   │
│   ├── utils/
│   │   ├── formatters.js            ← Feature 2: $currency and XX.XX% formatters
│   │   ├── statusClassifier.js      ← Feature 3: Failed / negative-ROI row detector
│   │   └── errorRecovery.js         ← Stream crash handler: retry + state reset
│   │
│   └── styles/
│       ├── global.css               ← CSS variables, reset, dark terminal theme
│       ├── kpi.css                  ← KPI strip layout
│       ├── grid.css                 ← VirtualGrid table + column alignment
│       ├── alerts.css               ← Feature 3: flash @keyframes (auto-expire)
│       ├── layout.css               ← Panel visibility + persistence classes
│       └── monitor.css              ← Performance overlay styles
│
├── index.html                       ← Vite entry HTML
├── vite.config.js
└── package.json
```

---

### Stream State Machine

Replace raw `isPaused` boolean with a proper state machine in `streamStateMachine.js`:

```
INITIALIZING
     │
     │  fetch() called for CSV
     ▼
  LOADING
     │
     │  CSV parsed, memoryPool ready
     ▼
 STREAMING  ◄──────────────────────────────┐
     │                                     │
     │  user clicks Pause                  │  user clicks Play + queue drained
     ▼                                     │
  PAUSED ──► batches buffer in pauseQueue  │
     │                                     │
     │  user clicks Play                   │
     ▼                                     │
 RESUMING ──► flush queue to stateEngine ──┘
     │
     │  dataStream throws / fetch fails
     ▼
  ERROR ──► errorRecovery.js ──► retry ──► LOADING
```

Each state drives the UI: overlay text, button label, queue counter, and whether `stateEngine` accepts incoming batches.

---

### Event-Driven Architecture

`eventBus.js` is a minimal pub/sub dispatcher (no external library):

```js
// eventBus.js
const listeners = {};
export const on  = (event, fn) => (listeners[event] ??= []).push(fn);
export const off = (event, fn) => listeners[event] = listeners[event].filter(f => f !== fn);
export const emit = (event, payload) => listeners[event]?.forEach(fn => fn(payload));
```

Events emitted:

| Event | Emitted by | Consumed by |
|---|---|---|
| `BATCH_RECEIVED` | streamBridge | stateEngine, metricsEngine, pauseQueue |
| `STATE_UPDATED` | stateEngine | computeWorker (triggers re-sort/filter) |
| `WORKER_RESULT` | computeWorker | VirtualGrid (updates visible rows) |
| `KPI_UPDATED` | metricsEngine | KPIStrip |
| `STREAM_STATE_CHANGED` | streamStateMachine | PauseControl, PerformanceMonitor |
| `ALERT_TRIGGERED` | selectAlerts | AlertSystem (DOM class toggle only) |
| `LAYOUT_CHANGED` | LayoutManager | App.jsx panels |

This decouples every module. KPI updates never touch the grid. Grid re-renders never touch the toolbar.

**Event Priority Levels**

Not all events are equally urgent. Define priority tiers to prevent low-priority work from blocking critical stream processing:

| Priority | Events | Why |
|---|---|---|
| **HIGH** | `BATCH_RECEIVED`, `STREAM_STATE_CHANGED`, `ERROR` | Stream data and lifecycle — must process immediately |
| **MEDIUM** | `STATE_UPDATED`, `WORKER_RESULT`, `ALERT_TRIGGERED` | Data pipeline — process in current frame |
| **LOW** | `KPI_UPDATED`, `LAYOUT_CHANGED`, performance sampling | UI cosmetics — can defer one frame if needed |

Implementation: HIGH events fire synchronously. MEDIUM events queue via `queueMicrotask`. LOW events defer via `requestAnimationFrame`.

---

### Web Worker Architecture

Heavy computation — filter, search, sort — runs in `computeWorker.js`, off the main thread.

**Critical optimization: only changed rows cross the thread boundary.**

Sending the full 50k pool via `postMessage` every 200ms triggers structured cloning of ~50,000 objects per tick — expensive serialization overhead. Instead the Worker maintains its own internal cached copy of the pool and only receives the delta (the `incomingBatch`, typically 5–50 rows):

```
Main Thread                              computeWorker.js
     │                                         │
     │  On stream init (once):                 │
     │  postMessage({ type: 'INIT',            │
     │    fullPool: [...map.values()] })        │  ← one-time full transfer
     │ ──────────────────────────────────────► │  Worker caches pool internally
     │                                         │
     │  Every 200ms tick:                      │
     │  postMessage({ type: 'PATCH',           │
     │    batch: incomingBatch })              │  ← only 5–50 rows per tick
     │ ──────────────────────────────────────► │
     │                                         │  Worker upserts patch into
     │                                         │  its internal cache
     │                                         │
     │                                         │  → incremental sort update
     │                                         │  → filter pass on changed rows
     │                                         │  → search pass on changed rows
     │                                         │
     │  onmessage({ visibleRows })             │
     │ ◄────────────────────────────────────── │  only visible slice returned
     │                                         │
     ▼
VirtualGrid receives result,
RAF-swaps content into fixed <tr> nodes
```

**Sort optimization — avoid full O(n log n) re-sort every tick:**

```
Incoming patch (5–50 rows)
        │
        ▼
For each updated row:
  1. Find old position in sorted array  →  binary search  O(log n)
  2. Remove it                          →  splice          O(1) with index
  3. Re-insert at correct new position  →  binary search insert  O(log n)
        │
        ▼
Total cost: O(k log n) per tick   where k = batch size (5–50)
vs. O(n log n) = sorting all 50,000 rows every tick
```

Only trigger a **full re-sort** when: sort keys change, filters change, or search tokens change — not on every incoming patch.

---

### Selector Layer

Selectors live in `src/selectors/` and act as pure derived-state functions. Nothing computes twice if inputs haven't changed:

```js
// selectVisibleRows.js
export const selectVisibleRows = memoize((pool, filters, searchTokens, sortKeys) => {
  // result comes from computeWorker — this selector just caches the last Worker output
  return lastWorkerResult;
});

// selectKPIs.js
export const selectKPIs = memoize((metrics) => ({
  totalRowsProcessed: metrics.totalRows,
  totalRobotsDeployed: metrics.robotsSum,
  globalSavings: metrics.savingsSum,
}));

// selectAlerts.js
export const selectAlerts = (batch) =>
  batch.filter(row => row.project_status === 'Failed' || row.roi_percent < 0);
```

**Precomputed Search Index**

Do not rebuild the search string on every query. Build it once when a row enters the pool, then update it only when that row is patched:

```js
// Inside computeWorker.js — when a row is upserted:
const buildSearchIndex = (row) =>
  [row.project_name, row.company_id, row.implementation_partner, row.country]
    .join(' ')
    .toLowerCase();

// Store alongside the row:
workerPool.set(row.internal_uid, {
  ...row,
  _searchIndex: buildSearchIndex(row)   // pre-built, never recomputed on query
});

// At query time — O(1) string lookup per row:
const matches = (row, tokens) =>
  tokens.every(token => row._searchIndex.includes(token));
```

This turns every search pass from "rebuild + scan" into "scan only" — significant savings across 50k rows.

Selectors ensure KPIStrip only re-renders when KPI values change, not on every batch.

---

### Render Isolation Map

Each component re-renders only when its specific data slice changes:

| Component | Re-renders when | Does NOT re-render when |
|---|---|---|
| `KPIStrip` | `selectKPIs` output changes | Grid scrolls, filter changes, sort changes |
| `VirtualGrid` | `WORKER_RESULT` event fires | KPIs update, toolbar changes |
| `FilterBar` | `selectFilterOptions` changes | Stream ticks, KPI updates |
| `SearchBar` | User types | Everything else |
| `PauseControl` | Stream state changes | Grid updates |
| `LayoutManager` | Panel toggle clicked | Stream ticks, data updates |
| `PerformanceMonitor` | RAF frame (16ms) | React state — reads perf APIs directly |

Achieved via: `React.memo` on all components, `useSyncExternalStore` for high-frequency external store subscriptions, `useMemo` for selector outputs, `useCallback` for handlers, and direct DOM ref mutations for scroll + alerts (bypassing React entirely).

> `GridRow.jsx` represents a **recycled viewport slot**, not a true data row. Consider naming it `ViewportRow.jsx` internally to keep this distinction clear during implementation.

---

### Virtualized Grid — Internal Mechanics

`VirtualGrid.jsx` is our own component implementing DOM virtualization from scratch:

```
Total pool: 50,000 rows (sorted + filtered)
                │
                │  User scrolls
                ▼
   scrollTop ÷ ROW_HEIGHT = startIndex
                │
                ▼
   visibleCount = ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN(5)
                │
                ▼
   pool.slice(startIndex, startIndex + visibleCount)
                │
                ▼
   N fixed <tr> DOM nodes (refs held in useRef array)
   │
   └── for each node: node.cells[i].textContent = row[columns[i]]
                │
                ▼
   Spacer div height = startIndex × ROW_HEIGHT  (creates scroll illusion)
```

All of the above runs inside `requestAnimationFrame`. React's reconciler is never involved in scroll updates — pure imperative DOM mutation for maximum throughput.

---

### Critical Engineering Decisions

**stateEngine.js — Map Upsert**
```js
incomingBatch.forEach(row => {
  statePool.set(row.internal_uid, row); // upsert, never push
});
// statePool.size stays at ≤50,000 permanently — no memory growth
```

**pauseQueue.js — Sequence-Safe Flush**
```js
// While PAUSED:
pendingQueue.push(...incomingBatch);

// On RESUMING:
while (pendingQueue.length > 0) {
  const batch = pendingQueue.splice(0, FLUSH_CHUNK_SIZE);
  stateEngine.upsert(batch);
}
// No records skipped, no records duplicated
```

**sortEngine.js — Compound Sort Keys**
```js
// sortKeys = [{ col: 'industry', dir: 'asc' }, { col: 'roi_percent', dir: 'desc' }]
const comparator = (a, b) => {
  for (const { col, dir } of sortKeys) {
    const result = a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0;
    if (result !== 0) return dir === 'asc' ? result : -result;
  }
  return 0;
};
// Single .sort() pass walks all keys — computed in Worker
```

**Alert System — Zero React Re-render**
```js
// Inside GridRow.jsx, after content swap:
const isAlert = row.project_status === 'Failed' || row.roi_percent < 0;
trRef.current.classList.toggle('row-alert', isAlert);
// Toggling a class via DOM ref causes zero React re-renders
```

```css
/* alerts.css */
@keyframes alertFlash {
  0%   { background-color: rgba(239, 68, 68, 0.25); }
  100% { background-color: transparent; }
}
.row-alert { animation: alertFlash 800ms ease-out forwards; }
```

**Error Recovery (errorRecovery.js)**
```js
// If dataStream crashes or fetch fails:
// 1. streamStateMachine transitions to ERROR
// 2. Show disconnected overlay to user
// 3. After 3s delay, attempt re-initialization
// 4. On success → LOADING → STREAMING
// 5. On repeated failure → display permanent error state
```

**Performance Monitor (PerformanceMonitor.jsx)**
```
Live debug overlay (toggleable, hidden by default):

┌─────────────────────────────┐
│  FPS         60             │
│  Heap        14.2 MB        │
│  Queue       0 batches      │
│  Rows/sec    ~250           │
│  Render      3.1 ms         │
└─────────────────────────────┘
```
Reads from `performance.memory`, `requestAnimationFrame` delta, and Worker message timing. Makes performance visible to judges without any external profiling tool.

---

### Chart Data Flow

The spec mentions an Analytics Chart panel (Feature 6 layout toggle). It needs its own update path — not piggybacking on the grid's Worker result:

```
metricsEngine.js
      │
      │  emits KPI_UPDATED with aggregated metrics
      ▼
selectChartData.js  (selector — derives chart series from metrics history)
      │
      ▼
ChartComponent.jsx
  - Renders using Canvas API (not SVG — Canvas scales better under rapid updates)
  - Subscribes via useSyncExternalStore to chart data store only
  - Re-renders independently of VirtualGrid
```

Chart receives data from `metricsEngine`, not from the sort/filter Worker — it visualizes aggregated KPIs, not individual rows.

---

## PART 5 — TESTING STRATEGY

Before shipping, validate these scenarios explicitly:

| Test | Scenario | Pass Condition |
|---|---|---|
| **Memory stability** | Run stream for 10 minutes uninterrupted | `performance.memory.usedJSHeapSize` stays flat — no upward drift |
| **Pause integrity** | Pause for 5 minutes, then Play | All buffered batches flush in order, zero records lost or duplicated |
| **Rapid filter switching** | Switch filters every 100ms for 30 seconds | No crashes, no stale rows visible, filter state always consistent |
| **Compound sort under load** | Shift+click 3 sort columns while stream is live | Sort order stable between ticks, no UI freeze |
| **Search under load** | Type rapidly while stream fires | No layout stutter, debounce absorbs keystrokes, results correct |
| **Scroll + stream simultaneous** | Scroll grid at full speed during live stream | 60 FPS maintained, no torn frames, no content flicker |
| **Worker recovery** | Force Worker crash via `worker.terminate()` then reinit | App shows error state, recovers on retry |
| **localStorage restore** | Toggle panels, hard refresh | Exact panel visibility states restored |
| **Empty filter state** | Filter to a category with zero matches | Empty state UI shown, no blank rows, no crash |
| **60 FPS budget** | Chrome Performance Profiler during peak load | No frames >16.7ms, no layout thrash in flame chart |

---

## PART 6 — BUILD SEQUENCE (EXECUTION ORDER)

| Step | Task | Feature(s) |
|---|---|---|
| 1 | Vite scaffold, folder structure, global CSS variables, dark theme | — |
| 2 | `eventBus.js` — pub/sub dispatcher with priority tiers, wired and tested | — |
| 3 | `streamBridge.js` + `streamStateMachine.js` — connect to `dataStream.js`, verify console logs | Setup |
| 4 | `stateEngine.js` — Map upsert logic, verify pool size stays ≤50k | — |
| 5 | `metricsEngine.js` + `selectKPIs.js` + `KPIStrip.jsx` | Feature 1 |
| 6 | `formatters.js` — currency + percent, apply everywhere | Feature 2 |
| 7 | `pauseQueue.js` + `PauseControl.jsx` + state machine PAUSED/RESUMING transitions | Feature 5 |
| 8 | `computeWorker.js` — Worker scaffolding, INIT full-pool transfer, PATCH delta protocol | — |
| 9 | Precomputed `_searchIndex` field built on upsert inside Worker | Feature 10 prep |
| 10 | Filter + search logic inside Worker + `FilterBar.jsx` + `selectFilterOptions.js` | Feature 7 |
| 11 | Incremental sort (binary search insert) inside Worker + `SortHeader.jsx` | Feature 4 |
| 12 | `useVirtualScroll.js` + `VirtualGrid.jsx` + `ViewportRow.jsx` — core recycling loop | Feature 8 |
| 13 | `statusClassifier.js` + alert CSS + class-toggle via DOM ref | Feature 3 |
| 14 | Extend sort for Shift+Click compound keys | Feature 9 |
| 15 | `SearchBar.jsx` (debounced, tokens to Worker) | Feature 10 |
| 16 | `LayoutManager.jsx` + localStorage persistence + `ChartComponent.jsx` | Feature 6 |
| 17 | `selectors/` layer — `useSyncExternalStore` wiring, render isolation verified | Performance |
| 18 | `PerformanceMonitor.jsx` — FPS / heap / queue overlay | Innovation |
| 19 | `errorRecovery.js` — Worker crash handler + stream retry logic | Robustness |
| 20 | Run all 10 test scenarios from Part 5. Fix any failures. | Testing |
| 21 | Chrome Profiler audit — confirm 60 FPS, flat heap, no layout thrash | Judging |
| 22 | Final modular code review, deployment to Vercel, record walkthrough video | Submission |

---

## PART 7 — JUDGING RUBRIC ALIGNMENT

| Rubric Category | Our Strategy |
|---|---|
| **Rendering Performance & Memory** | RAF-gated row recycler. Fixed `<tr>` node count. Map upsert caps pool at 50k. Delta-only Worker transfers. Incremental O(k log n) sort. Performance overlay shows judges live numbers. |
| **Logic & State Management** | Event bus with priority tiers. State machine replaces fragile booleans. Compound sort tree survives stream ticks. Pause queue is sequence-safe. Fuzzy search uses precomputed index + Worker. |
| **UI/UX Usability** | `useSyncExternalStore` for render isolation — KPI, grid, toolbar never cascade. Empty state guards on zero filter results. Monospace column alignment. Canvas chart updates independently. Generic designs explicitly avoided. |

---

## PART 8 — SUBMISSION CHECKLIST

- [ ] Public GitHub repository (not private, not 404)
- [ ] Live deployment URL (Vercel/Netlify — opens without login)
- [ ] Illustration/Walkthrough video explaining implementation
- [ ] All 10 features implemented and visually verifiable
- [ ] No banned libraries in `package.json` (`ag-grid`, `tanstack`, `react-window`, `react-virtualized`)
- [ ] No server-side code anywhere in the repository
- [ ] Codebase is modular — `engine/`, `workers/`, `selectors/`, `components/`, `utils/`, `styles/`
- [ ] `automation_projects.csv` and `dataStream.js` in `/public/` directory
- [ ] Web Worker confirmed running (DevTools → Sources → Workers tab)
- [ ] Delta-only Worker protocol verified (only `incomingBatch` sent per tick, not full pool)
- [ ] Chrome Performance Profiler — flat heap, steady 60 FPS under load
- [ ] Performance overlay active and showing healthy metrics during demo
- [ ] All 10 test scenarios from Part 5 passed
- [ ] Submitted before 10:00 PM IST on 28 June 2026

---

> *All engineering decisions in this document are governed by the Phase 2 Specification PDF. In case of any conflict, the official spec document takes precedence.*
> *Architecture document is a plan — if Chrome Profiler reveals a bottleneck during implementation, adjust based on measurement, not this document.*
