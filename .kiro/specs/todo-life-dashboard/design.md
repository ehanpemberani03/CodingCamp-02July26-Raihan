# Design Document: To-Do Life Dashboard

## Overview

The To-Do Life Dashboard is a self-contained, client-side single-page application (SPA) with zero dependencies and no build step. It is opened directly from the filesystem via the `file://` protocol and uses the browser's built-in APIs exclusively.

The application is composed of four interactive widgets rendered on a single HTML page:

- **Greeting Widget** — real-time clock, date, and time-based greeting
- **Focus Timer** — Pomodoro-style 25-minute countdown with Start / Stop / Reset controls
- **To-Do List** — persistent task manager with add, complete, edit, and delete operations
- **Quick Links** — user-defined shortcut buttons for fast external navigation

All state is persisted to the browser's `localStorage` under two keys (`dashboard_tasks` and `dashboard_links`). No network requests are made; no frameworks, libraries, or CDN assets are used.

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Vanilla JS (ES6+) | Requirement 10.3/10.4 prohibit external assets and build tools |
| Persistence | `localStorage` JSON | Requirement 8.1 specifies localStorage as the sole mechanism |
| Module boundary | Single `js/app.js` | Requirement 10.2 allows exactly one JS file |
| Styling | Single `css/style.css` | Requirement 10.1 allows exactly one CSS file |
| Rendering | Imperative DOM manipulation | No virtual DOM required; dataset is small |
| Timer implementation | `setInterval` at 1000 ms | Requirements 1.1 and 2.2 explicitly prescribe this approach |

---

## Architecture

The application follows a **module-pattern architecture** within a single JavaScript file. Each widget is encapsulated in its own IIFE-style object or closure module, all wired together in a top-level `init()` call that runs on `DOMContentLoaded`.

```
┌─────────────────────────────────────────────────────────┐
│                     index.html                          │
│  Links → css/style.css   Scripts → js/app.js            │
└─────────────────┬───────────────────────────────────────┘
                  │ DOMContentLoaded
                  ▼
┌─────────────────────────────────────────────────────────┐
│                      js/app.js                          │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ GreetingMod  │  │  TimerMod    │  │  StorageMod   │  │
│  │              │  │              │  │               │  │
│  │ setInterval  │  │ setInterval  │  │ read / write  │  │
│  │ (1 s clock)  │  │ (1 s timer)  │  │  JSON ↔ LS   │  │
│  └──────────────┘  └──────────────┘  └───────┬───────┘  │
│                                               │          │
│  ┌──────────────────────────┐  ┌──────────────▼───────┐  │
│  │        TodoMod           │  │      LinksMod        │  │
│  │                          │  │                      │  │
│  │  tasks[] (in-memory)     │  │  links[] (in-memory) │  │
│  │  render → DOM            │  │  render → DOM        │  │
│  │  CRUD → StorageMod       │  │  CRUD → StorageMod   │  │
│  └──────────────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. On page load, `StorageMod` reads both `dashboard_tasks` and `dashboard_links` from `localStorage`.
2. `TodoMod` and `LinksMod` receive the deserialized arrays and render the initial DOM.
3. User interactions trigger mutations on the in-memory arrays.
4. After every mutation, `StorageMod.write()` serializes and writes back to `localStorage`.
5. Rendering is always driven from the in-memory array (single source of truth), never re-read from `localStorage` mid-session.

---

## Components and Interfaces

### GreetingMod

Responsible for the clock, date string, and greeting text. Runs a single `setInterval` at 1000 ms.

```javascript
GreetingMod = {
  init(elements: { clock, date, greeting }),  // bind DOM refs, start interval
  tick(),                                      // update all three displays
  formatTime(date: Date): string,              // "HH:MM:SS"
  formatDate(date: Date): string,              // "Weekday, Month D, YYYY"
  getGreeting(hour: number): string,           // "Good Morning/Afternoon/Evening"
}
```

**Greeting rules:** hour 0–11 → "Good Morning", 12–17 → "Good Afternoon", 18–23 → "Good Evening"

---

### TimerMod

Manages the Pomodoro countdown. Maintains `remainingSeconds` (number) and `intervalId` (or null) internally.

```javascript
TimerMod = {
  INITIAL_SECONDS: 1500,                    // 25 * 60
  remainingSeconds: number,
  intervalId: number | null,

  init(elements: { display, btnStart, btnStop, btnReset, message }),
  start(),     // guard: ignore if already running; set disabled states; start interval
  stop(),      // clear interval; set disabled states
  reset(),     // clear interval; restore 1500 s; update display; hide message
  tick(),      // decrement; update display; call onComplete() at 0
  onComplete(), // clear interval; show "Time's up!"; disable Start+Stop; enable Reset
  formatDisplay(seconds: number): string,  // "MM:SS" with zero-padding
  updateButtons(state: 'idle'|'running'|'done'),
}
```

---

### StorageMod

Thin wrapper around `localStorage`. All reads and writes go through here to centralise error handling.

```javascript
StorageMod = {
  TASKS_KEY: 'dashboard_tasks',
  LINKS_KEY: 'dashboard_links',

  readTasks(): Task[],     // returns [] on missing key or bad JSON
  readLinks(): Link[],     // returns [] on missing key or bad JSON
  writeTasks(tasks: Task[]): boolean,  // returns false and shows notice on error
  writeLinks(links: Link[]): boolean,  // returns false and shows notice on error
  _read(key: string): any,             // shared read helper
  _write(key: string, value: any): boolean,  // shared write helper; catches QuotaExceededError
  showError(message: string),          // renders non-blocking inline error notice
}
```

---

### TodoMod

Manages the in-memory `tasks` array and the task list DOM. A task item's edit mode is tracked via a `data-editing="true"` attribute on the rendered `<li>`.

```javascript
TodoMod = {
  tasks: Task[],

  init(elements: { list, input, addBtn }),
  load(),                        // reads from StorageMod; renders all
  render(),                      // full re-render of <ul> from tasks[]
  renderItem(task: Task): HTMLElement,
  addTask(text: string),         // trim, validate, cap 500 chars, push, render, save
  deleteTask(id: string),        // filter, render, save
  toggleComplete(id: string),    // flip completed, render, save
  enterEditMode(id: string),     // replace text span with <input> + Save/Cancel buttons
  confirmEdit(id: string, newText: string),  // trim, validate, update, exit edit, save
  cancelEdit(id: string),        // restore original display, exit edit
  save(),                        // delegates to StorageMod.writeTasks(tasks)
}
```

---

### LinksMod

Mirrors `TodoMod` in structure but for the `links` array. Default links are seeded when `localStorage` has no saved data.

```javascript
LinksMod = {
  DEFAULT_LINKS: [
    { id: uuid(), label: 'Google', url: 'https://www.google.com' },
    { id: uuid(), label: 'GitHub', url: 'https://www.github.com' },
    { id: uuid(), label: 'YouTube', url: 'https://www.youtube.com' },
  ],
  links: Link[],

  init(elements: { container, labelInput, urlInput, addBtn }),
  load(),                        // reads from StorageMod; seeds defaults if empty
  render(),                      // re-renders link buttons
  renderItem(link: Link): HTMLElement,
  addLink(label: string, url: string),   // validate; push; render; save
  deleteLink(id: string),               // filter; render; save
  openLink(link: Link),                  // protocol check; open tab or show error
  validateUrl(url: string): boolean,     // must start with http:// or https://
  save(),                               // delegates to StorageMod.writeLinks(links)
}
```

---

### NotificationMod (utility)

Small module for displaying non-blocking inline error/info messages.

```javascript
NotificationMod = {
  show(container: HTMLElement, message: string, durationMs?: number),
  // creates a <p class="notice"> element, inserts it, auto-removes after durationMs (default: 3000)
}
```

---

## Data Models

### Task

```javascript
{
  id: string,          // UUID v4 generated at creation time
  text: string,        // 1–500 characters, trimmed
  completed: boolean,  // false on creation
  createdAt: number,   // Date.now() timestamp, used to preserve insertion order
}
```

Tasks are stored as a JSON array under `localStorage` key `"dashboard_tasks"`.

### Link

```javascript
{
  id: string,    // UUID v4 generated at creation time
  label: string, // 1–100 characters (display name)
  url: string,   // 1–2048 characters, must start with http:// or https://
}
```

Links are stored as a JSON array under `localStorage` key `"dashboard_links"`.

### UUID Generation

Since no external library is used, UUIDs are generated with the browser's built-in `crypto.randomUUID()` (available in all modern browsers). A fallback using `Math.random()` is provided for environments where `crypto` is unavailable.

```javascript
function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
```

### Local Storage Schema

| Key | Type | Description |
|---|---|---|
| `dashboard_tasks` | JSON string (`Task[]`) | Ordered array of task objects |
| `dashboard_links` | JSON string (`Link[]`) | Ordered array of link objects |

Both keys are absent on first load. Missing or invalid JSON results in an empty array and no unhandled exception (Requirement 8.4).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Time Format Zero-Padding

*For any* `Date` object, `GreetingMod.formatTime(date)` SHALL return a string that matches the pattern `HH:MM:SS` where each field is exactly two digits (zero-padded when the value is a single digit).

**Validates: Requirements 1.1**

---

### Property 2: Date String Contains All Required Components

*For any* `Date` object, `GreetingMod.formatDate(date)` SHALL return a string that contains the full weekday name, the full month name, the numeric day-of-month, and the four-digit year derived from that date.

**Validates: Requirements 1.2**

---

### Property 3: Greeting Correctness for Any Hour

*For any* integer hour in the range 0–23, `GreetingMod.getGreeting(hour)` SHALL return:
- `"Good Morning"` when hour is in [0, 11]
- `"Good Afternoon"` when hour is in [12, 17]
- `"Good Evening"` when hour is in [18, 23]

Every valid hour value maps to exactly one greeting; no hour is left unmapped.

**Validates: Requirements 1.3, 1.4, 1.5**

---

### Property 4: Timer Display Zero-Padding

*For any* integer number of seconds in the range [0, 1500], `TimerMod.formatDisplay(seconds)` SHALL return a string that matches the pattern `MM:SS` where both fields are exactly two digits (zero-padded), with the correct minute and second values.

**Validates: Requirements 2.3**

---

### Property 5: Valid Task Addition Grows List and Persists

*For any* non-empty string (after trimming leading and trailing whitespace), calling `TodoMod.addTask(text)` SHALL increase `tasks.length` by exactly 1, the newly created task's `text` property SHALL equal the trimmed input (capped at 500 characters), and the serialized tasks array written to `localStorage["dashboard_tasks"]` SHALL contain the new task.

**Validates: Requirements 3.2**

---

### Property 6: Whitespace-Only Input Is Rejected

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), calling `TodoMod.addTask(text)` SHALL leave `tasks.length` unchanged and SHALL NOT write to `localStorage`.

**Validates: Requirements 3.3**

---

### Property 7: Task Rendering Includes All Required Controls

*For any* valid `Task` object, `TodoMod.renderItem(task)` SHALL return a DOM element that contains: the task's description text, a completion toggle control, an edit control, and a delete control.

**Validates: Requirements 3.4**

---

### Property 8: Completion Toggle Is an Involution (Double-Toggle Restores State)

*For any* task with an initial completion state, calling `TodoMod.toggleComplete(id)` twice in succession SHALL restore the task's `completed` field to its original value, and both intermediate and final states SHALL be persisted to `localStorage`.

**Validates: Requirements 4.1**

---

### Property 9: Completed Task Rendering Has Strikethrough Class

*For any* `Task` object with `completed === true`, `TodoMod.renderItem(task)` SHALL return a DOM element that has the CSS class (or inline style) conveying `text-decoration: line-through` and an opacity value ≤ 0.6.

**Validates: Requirements 4.2**

---

### Property 10: Task Deletion Removes From List and Storage

*For any* task currently in `tasks[]`, calling `TodoMod.deleteTask(id)` SHALL result in `tasks[]` no longer containing a task with that `id`, and the serialized value written to `localStorage["dashboard_tasks"]` SHALL also not contain that `id`.

**Validates: Requirements 4.3**

---

### Property 11: Edit Confirmation Updates Task Text

*For any* existing task and any non-empty, non-whitespace-only string `newText`, calling `TodoMod.confirmEdit(id, newText)` SHALL update the task's `text` to `newText.trim()` (capped at 500 characters), exit edit mode, and persist the updated array to `localStorage`.

**Validates: Requirements 5.3**

---

### Property 12: Edit Confirmation With Whitespace Preserves Original Text

*For any* existing task with text `originalText` and *for any* string composed entirely of whitespace, calling `TodoMod.confirmEdit(id, whitespaceString)` SHALL leave the task's `text` equal to `originalText` and SHALL NOT write to `localStorage`.

**Validates: Requirements 5.4**

---

### Property 13: Link Label Truncation

*For any* `Link` object, `LinksMod.renderItem(link)` SHALL display a label that is at most 30 characters long; if `link.label.length > 30`, the displayed text SHALL be the first 30 characters of the label followed by the ellipsis character `"…"`.

**Validates: Requirements 6.1**

---

### Property 14: Invalid URL Does Not Open a Tab

*For any* `Link` object whose `url` does NOT start with `"http://"` or `"https://"`, calling `LinksMod.openLink(link)` SHALL NOT invoke `window.open` and SHALL display an inline error message.

**Validates: Requirements 6.3**

---

### Property 15: Valid Link Addition Grows List and Persists

*For any* non-empty `label` (after trimming) and `url` that starts with `"http://"` or `"https://"`, calling `LinksMod.addLink(label, url)` SHALL increase `links.length` by exactly 1 and the serialized links array written to `localStorage["dashboard_links"]` SHALL contain the new link.

**Validates: Requirements 7.2**

---

### Property 16: Invalid Link Input Is Rejected

*For any* submission where `label` is empty/whitespace, or `url` does not start with `"http://"` or `"https://"`, calling `LinksMod.addLink(label, url)` SHALL leave `links.length` unchanged, SHALL NOT write to `localStorage`, and SHALL display an inline validation message.

**Validates: Requirements 7.3**

---

### Property 17: Link Deletion Removes From List and Storage

*For any* link currently in `links[]`, calling `LinksMod.deleteLink(id)` SHALL result in `links[]` no longer containing a link with that `id`, and the serialized value written to `localStorage["dashboard_links"]` SHALL also not contain that `id`.

**Validates: Requirements 7.4**

---

### Property 18: Tasks Storage Round-Trip

*For any* valid `Task[]` array, calling `StorageMod.writeTasks(tasks)` followed by `StorageMod.readTasks()` SHALL return an array that is deeply equal to the original `tasks` array, preserving all field values and insertion order.

**Validates: Requirements 8.2, 3.5**

---

### Property 19: Links Storage Round-Trip

*For any* valid `Link[]` array, calling `StorageMod.writeLinks(links)` followed by `StorageMod.readLinks()` SHALL return an array that is deeply equal to the original `links` array, preserving all field values and insertion order.

**Validates: Requirements 8.3, 6.4**

---

### Property 20: Invalid or Absent JSON Returns Empty Array

*For any* value stored under a storage key that is either `null`, `undefined`, or a string that is not valid JSON, the corresponding `StorageMod` read function (`readTasks` or `readLinks`) SHALL return an empty array `[]` without throwing an exception.

**Validates: Requirements 8.4**

---

## Error Handling

### Storage Errors

All `localStorage` interactions are wrapped in try/catch in `StorageMod._write()` and `StorageMod._read()`:

- **Read failures** (unavailable API, non-JSON data): return empty `[]`; display a non-blocking notice via `NotificationMod`
- **Write failures** (`QuotaExceededError` or other): return `false`; display "Unable to save data — storage full"; retain in-memory state

### URL Validation Errors

- Links with invalid URL protocol display an inline "Invalid URL" message adjacent to the link button, auto-dismissed after 3 seconds

### Input Validation

- Empty/whitespace task or link label submissions are silently ignored; focus is retained on the input field
- Invalid URL on link add: `LinksMod.addLink` displays a validation message identifying the invalid field(s) and focuses the first invalid field

### Timer Edge Cases

- The `start()` guard check prevents duplicate `setInterval` calls if the button's `disabled` attribute is somehow bypassed
- `reset()` always calls `clearInterval` before resetting state, even if `intervalId` is already `null`

---

## Testing Strategy

### PBT Applicability Assessment

This feature contains substantial pure-function logic — time/date formatting, text validation, state transformations, and JSON serialization — making it well-suited for property-based testing. The data models are simple, inputs are bounded, and the functions have clear input/output contracts.

**PBT IS applicable** for the formatting, validation, and storage modules.  
**PBT is NOT applicable** for UI rendering tests (visual contrast, layout), timer interval behavior (side-effectful), and localStorage availability smoke tests.

### Property-Based Testing Library

Use **[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript/TypeScript PBT library). Since the project has no build step, fast-check will be loaded from a local copy (bundled UMD build) placed in `js/vendor/fast-check.umd.js`, keeping Requirement 10.4 intact.

Each property test is configured to run a **minimum of 100 iterations**.

### Test File Structure

```
tests/
  unit/
    greeting.test.js     — Properties 1, 2, 3
    timer.test.js        — Property 4
    todo.test.js         — Properties 5, 6, 7, 8, 9, 10, 11, 12
    links.test.js        — Properties 13, 14, 15, 16, 17
    storage.test.js      — Properties 18, 19, 20
  integration/
    persistence.test.js  — full session persistence examples
    defaults.test.js     — default link seeding example
```

### Unit Tests (Example-Based)

These cover behaviors that are not universal properties:

- Timer initial state (Req 2.1)
- Timer Start/Stop/Reset/Complete lifecycle (Req 2.4, 2.5, 2.6)
- Timer button disabled states for each state (Req 2.7, 2.8, 2.9)
- Edit mode enter/cancel flow (Req 5.1, 5.2, 5.5)
- Valid URL opens new tab (Req 6.2)
- Default links seeded on first load (Req 6.6)
- LocalStorage unavailable → empty task array + error notice (Req 3.6, edge)
- LocalStorage write failure → error notice + in-memory retention (Req 4.5, 8.5)

### Property Tests (PBT)

Each property-based test corresponds to a numbered property in the Correctness Properties section above. Tags are in the format:

```
// Feature: todo-life-dashboard, Property N: <property title>
```

| Property | Function Under Test | Arbitraries |
|---|---|---|
| P1 | `formatTime` | `fc.date()` |
| P2 | `formatDate` | `fc.date()` |
| P3 | `getGreeting` | `fc.integer({ min: 0, max: 23 })` |
| P4 | `formatDisplay` | `fc.integer({ min: 0, max: 1500 })` |
| P5 | `addTask` | `fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)` |
| P6 | `addTask` | `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` |
| P7 | `renderItem` (task) | `fc.record({ id: fc.uuid(), text: fc.string({ minLength: 1 }), completed: fc.boolean() })` |
| P8 | `toggleComplete` | task record arbitraries |
| P9 | `renderItem` (completed task) | task record with `completed: true` |
| P10 | `deleteTask` | non-empty task array + selected id |
| P11 | `confirmEdit` | task record + non-whitespace string |
| P12 | `confirmEdit` | task record + whitespace string |
| P13 | `renderItem` (link) | `fc.record({ label: fc.string({ minLength: 1 }) })` |
| P14 | `openLink` | `fc.record({ url: fc.string().filter(s => !s.startsWith('http://') && !s.startsWith('https://')) })` |
| P15 | `addLink` | non-empty label + url starting with http:// or https:// |
| P16 | `addLink` | empty label or invalid-protocol URL |
| P17 | `deleteLink` | non-empty link array + selected id |
| P18 | `writeTasks` / `readTasks` | `fc.array(taskArbitrary)` |
| P19 | `writeLinks` / `readLinks` | `fc.array(linkArbitrary)` |
| P20 | `readTasks` / `readLinks` | `fc.oneof(fc.constant(null), fc.string().filter(s => { try { JSON.parse(s); return false; } catch { return true; } }))` |

### Integration Tests

- **Persistence session test**: Load → add tasks and links → simulate page reload (re-read from localStorage) → verify all data restored in insertion order
- **Default links test**: Empty localStorage → load → verify Google, GitHub, YouTube buttons rendered
- **Storage error recovery**: Simulate QuotaExceededError → verify error message shown and in-memory data intact

### Accessibility Checks

Contrast ratio and responsive layout (Requirements 9.4, 9.5) require manual verification with browser DevTools and an accessibility audit tool (e.g., axe, Lighthouse). Full WCAG 2.1 Level AA validation requires manual testing with assistive technologies and expert accessibility review.
