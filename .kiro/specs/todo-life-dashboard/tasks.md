# Implementation Plan: To-Do Life Dashboard

## Overview

Implement a self-contained, client-side single-page application with four widgets (Greeting, Focus Timer, To-Do List, Quick Links) using vanilla HTML, CSS, and JavaScript. All persistence is via `localStorage`. No build step, no frameworks, no external assets.

## Tasks

- [x] 1. Set up project structure and HTML skeleton
  - Create `index.html` with semantic sections for all four widgets (Greeting, Focus Timer, To-Do List, Quick Links)
  - Create `css/style.css` (empty placeholder) and `js/app.js` (empty placeholder)
  - Add `<link>` tag for `css/style.css` and `<script defer>` tag for `js/app.js` in `index.html`
  - Create `js/vendor/` directory; add a local UMD copy of fast-check (`fast-check.umd.js`) for use in property tests
  - Create `tests/unit/` and `tests/integration/` directories with empty placeholder test files
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 2. Implement the `uuid()` utility and `StorageMod`
  - [x] 2.1 Implement `uuid()` helper using `crypto.randomUUID()` with a `Math.random()` fallback
    - Define the function at the top of `js/app.js`
    - _Requirements: 8.1_
  - [x] 2.2 Implement `StorageMod` with `_read`, `_write`, `readTasks`, `readLinks`, `writeTasks`, `writeLinks`, and `showError`
    - `_read`: wrap `localStorage.getItem` in try/catch; return parsed JSON or `[]` on any error
    - `_write`: wrap `localStorage.setItem` in try/catch; catch `QuotaExceededError` and call `showError`
    - `showError`: delegate to `NotificationMod.show` (stubbed until NotificationMod is built in task 3)
    - Use keys `dashboard_tasks` and `dashboard_links`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ]* 2.3 Write property tests for `StorageMod` (Properties 18, 19, 20)
    - **Property 18: Tasks Storage Round-Trip** — `writeTasks` then `readTasks` returns deeply equal array
    - **Property 19: Links Storage Round-Trip** — `writeLinks` then `readLinks` returns deeply equal array
    - **Property 20: Invalid or Absent JSON Returns Empty Array** — null/invalid JSON → `[]`, no exception
    - Place tests in `tests/unit/storage.test.js`
    - _Requirements: 8.2, 8.3, 8.4, 3.5, 6.4_

- [x] 3. Implement `NotificationMod`
  - [x] 3.1 Implement `NotificationMod.show(container, message, durationMs)` in `js/app.js`
    - Create a `<p class="notice">` element, insert it into `container`, auto-remove after `durationMs` (default 3000 ms)
    - Wire `StorageMod.showError` to use `NotificationMod.show` after this is available
    - _Requirements: 3.6, 4.5, 6.5, 8.5_

- [x] 4. Implement `GreetingMod`
  - [x] 4.1 Implement `GreetingMod.formatTime`, `formatDate`, `getGreeting`, `tick`, and `init` in `js/app.js`
    - `formatTime`: return `HH:MM:SS` with zero-padding for hours, minutes, seconds
    - `formatDate`: return full weekday name, full month name, numeric day, four-digit year (e.g., "Monday, July 2, 2025") using browser local time zone
    - `getGreeting(hour)`: return "Good Morning" (0–11), "Good Afternoon" (12–17), "Good Evening" (18–23)
    - `tick`: call all three formatters and update the bound DOM elements
    - `init`: accept `{ clock, date, greeting }` DOM refs; call `tick()` immediately; start `setInterval(tick, 1000)`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [ ]* 4.2 Write property tests for `GreetingMod` (Properties 1, 2, 3)
    - **Property 1: Time Format Zero-Padding** — any `Date` → `formatTime` output matches `/^\d{2}:\d{2}:\d{2}$/`
    - **Property 2: Date String Contains All Required Components** — any `Date` → `formatDate` contains weekday, month, day, year
    - **Property 3: Greeting Correctness for Any Hour** — `fc.integer({ min: 0, max: 23 })` → exactly one of the three greeting strings
    - Place tests in `tests/unit/greeting.test.js`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 5. Implement `TimerMod`
  - [x] 5.1 Implement `TimerMod.formatDisplay` in `js/app.js`
    - Accept seconds (0–1500), return `MM:SS` string with two-digit zero-padded fields
    - _Requirements: 2.3_
  - [ ]* 5.2 Write property test for `TimerMod.formatDisplay` (Property 4)
    - **Property 4: Timer Display Zero-Padding** — `fc.integer({ min: 0, max: 1500 })` → output matches `/^\d{2}:\d{2}$/` with correct values
    - Place test in `tests/unit/timer.test.js`
    - _Requirements: 2.3_
  - [x] 5.3 Implement `TimerMod` state machine: `init`, `start`, `stop`, `reset`, `tick`, `onComplete`, `updateButtons`
    - `init`: bind DOM refs (`display`, `btnStart`, `btnStop`, `btnReset`, `message`); set `remainingSeconds = 1500`; call `updateButtons('idle')`
    - `start`: guard against duplicate intervals; set `intervalId`; call `updateButtons('running')`
    - `stop`: clear interval; set `intervalId = null`; call `updateButtons('idle')`
    - `reset`: clear interval; set `remainingSeconds = 1500`; update display to "25:00"; hide message; call `updateButtons('idle')`
    - `tick`: decrement `remainingSeconds`; update display; call `onComplete()` when reaching 0
    - `onComplete`: clear interval; show "Time's up!" message; call `updateButtons('done')`
    - `updateButtons('idle')`: Start enabled, Stop disabled; `updateButtons('running')`: Start disabled, Stop enabled; `updateButtons('done')`: both disabled, Reset enabled
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_
  - [ ]* 5.4 Write unit tests for `TimerMod` lifecycle
    - Test initial state (display "25:00", Start enabled, Stop disabled)
    - Test Start → Stop lifecycle and disabled states
    - Test Reset restores 1500 s and clears message
    - Test countdown reaching 00:00 triggers `onComplete` and shows message
    - Place tests in `tests/unit/timer.test.js`
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass; ask the user if questions arise.

- [x] 7. Implement `TodoMod`
  - [x] 7.1 Implement `TodoMod` core: `init`, `load`, `render`, `renderItem`, `addTask`, `deleteTask`, `toggleComplete`, `save`
    - `init`: bind DOM refs (`list`, `input`, `addBtn`); wire event listeners; call `load()`
    - `load`: call `StorageMod.readTasks()`; assign to `tasks`; call `render()`; handle `localStorage` unavailability by showing error notice
    - `addTask(text)`: trim, reject empty/whitespace-only (retain focus on input), cap at 500 chars, push task object with `uuid()`, `completed: false`, `createdAt: Date.now()`; call `render()` then `save()`
    - `deleteTask(id)`: filter out task by `id`; call `render()` then `save()`
    - `toggleComplete(id)`: flip `completed`; call `render()` then `save()`
    - `renderItem(task)`: create `<li>` with text, completion toggle, edit button, delete button; apply strikethrough class and opacity ≤ 0.6 when `completed === true`
    - `render()`: clear `<ul>` and re-render all tasks from `tasks[]`
    - `save()`: delegate to `StorageMod.writeTasks(tasks)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ]* 7.2 Write property tests for `TodoMod` (Properties 5, 6, 7, 8, 9, 10)
    - **Property 5: Valid Task Addition Grows List and Persists** — non-empty trimmed string → `tasks.length` increases by 1, task saved to `localStorage`
    - **Property 6: Whitespace-Only Input Is Rejected** — whitespace-only string → `tasks.length` unchanged, no `localStorage` write
    - **Property 7: Task Rendering Includes All Required Controls** — any valid Task → rendered element contains text, toggle, edit, delete controls
    - **Property 8: Completion Toggle Is an Involution** — double `toggleComplete` restores original `completed` value
    - **Property 9: Completed Task Rendering Has Strikethrough Class** — Task with `completed === true` → rendered element has strikethrough style and opacity ≤ 0.6
    - **Property 10: Task Deletion Removes From List and Storage** — `deleteTask(id)` → `tasks[]` and `localStorage` no longer contain that id
    - Place tests in `tests/unit/todo.test.js`
    - _Requirements: 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_
  - [x] 7.3 Implement `TodoMod` edit mode: `enterEditMode`, `confirmEdit`, `cancelEdit`
    - `enterEditMode(id)`: replace task text span with `<input>` pre-populated with current text; add Save and Cancel buttons; move focus to input; set `data-editing="true"` on the `<li>`
    - `confirmEdit(id, newText)`: trim; if empty/whitespace → discard change and exit edit mode without saving; else cap at 500 chars, update `task.text`, exit edit mode, call `save()`
    - `cancelEdit(id)`: restore original text display, exit edit mode, no `localStorage` write
    - Wire edit button click and double-click on task text to `enterEditMode`; wire Enter key and Save button to `confirmEdit`; wire Escape key and Cancel button to `cancelEdit`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [-]* 7.4 Write property tests for `TodoMod` edit mode (Properties 11, 12)
    - **Property 11: Edit Confirmation Updates Task Text** — non-empty non-whitespace `newText` → task text equals `newText.trim()` (capped 500), persisted
    - **Property 12: Edit Confirmation With Whitespace Preserves Original Text** — whitespace-only `newText` → task text unchanged, no `localStorage` write
    - Place tests in `tests/unit/todo.test.js`
    - _Requirements: 5.3, 5.4_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass; ask the user if questions arise.

- [x] 9. Implement `LinksMod`
  - [x] 9.1 Implement `LinksMod` core: `init`, `load`, `render`, `renderItem`, `addLink`, `deleteLink`, `openLink`, `validateUrl`, `save`
    - `init`: bind DOM refs (`container`, `labelInput`, `urlInput`, `addBtn`); wire event listeners; call `load()`
    - `load`: call `StorageMod.readLinks()`; if result is empty, seed `DEFAULT_LINKS` and save; call `render()`; handle `localStorage` unavailability by showing error notice
    - `addLink(label, url)`: trim label; validate label non-empty and `validateUrl(url)`; if invalid, show inline validation message and focus first invalid field; else push link with `uuid()`, call `render()`, `save()`, clear inputs
    - `deleteLink(id)`: filter out link by `id`; call `render()` then `save()`
    - `openLink(link)`: call `validateUrl(link.url)`; if valid, `window.open(link.url, '_blank')`; if invalid, show inline "Invalid URL" error via `NotificationMod.show` with 3000 ms duration
    - `validateUrl(url)`: return `true` only if `url.startsWith('http://')` or `url.startsWith('https://')`
    - `renderItem(link)`: create button with label truncated to 30 characters + "…" if longer; wire click to `openLink`; add delete control
    - `render()`: clear container and re-render all link buttons from `links[]`
    - `save()`: delegate to `StorageMod.writeLinks(links)`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4_
  - [-]* 9.2 Write property tests for `LinksMod` (Properties 13, 14, 15, 16, 17)
    - **Property 13: Link Label Truncation** — any label longer than 30 chars → displayed label is first 30 chars + "…"
    - **Property 14: Invalid URL Does Not Open a Tab** — url not starting with `http://` or `https://` → `window.open` not called, inline error shown
    - **Property 15: Valid Link Addition Grows List and Persists** — valid label + valid url → `links.length` +1, saved to `localStorage`
    - **Property 16: Invalid Link Input Is Rejected** — empty label or invalid-protocol url → `links.length` unchanged, no `localStorage` write, validation message shown
    - **Property 17: Link Deletion Removes From List and Storage** — `deleteLink(id)` → id absent from `links[]` and `localStorage`
    - Place tests in `tests/unit/links.test.js`
    - _Requirements: 6.1, 6.3, 7.2, 7.3, 7.4_

- [x] 10. Write integration tests
  - [x]* 10.1 Write persistence session integration test
    - Simulate adding tasks and links → serialise to `localStorage` → re-read via `StorageMod` → verify all data restored in insertion order
    - Place test in `tests/integration/persistence.test.js`
    - _Requirements: 3.5, 6.4, 8.2, 8.3_
  - [x]* 10.2 Write default links integration test
    - Simulate empty `localStorage` → call `LinksMod.load()` → verify Google, GitHub, YouTube buttons rendered
    - Place test in `tests/integration/defaults.test.js`
    - _Requirements: 6.6_
  - [x]* 10.3 Write storage error recovery integration test
    - Simulate `QuotaExceededError` during write → verify error notice shown and in-memory data intact
    - Place test in `tests/integration/persistence.test.js`
    - _Requirements: 4.5, 8.5_

- [ ] 11. Implement CSS layout and visual design
  - [x] 11.1 Implement base layout in `css/style.css`
    - Use CSS Grid or Flexbox to arrange four widgets with at least 16px gap between boundaries
    - Set body font size to minimum 16px
    - Ensure colour contrast ratios: ≥ 4.5:1 for normal text, ≥ 3:1 for large text, against backgrounds (WCAG 2.1 AA)
    - Use no inline `style` attributes in HTML (dynamic JS-applied styles permitted)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [~] 11.2 Implement responsive layout for viewports ≤ 768px
    - Add media query that reflows all widgets into a single-column stacked arrangement
    - Ensure no horizontal scrollbar appears at 768px viewport width
    - _Requirements: 9.5_
  - [~] 11.3 Style all widget components (timer display, task items, link buttons, notices, edit mode controls)
    - Apply strikethrough (`text-decoration: line-through`) and opacity ≤ 0.6 via CSS class for completed tasks
    - Style `.notice` element for non-blocking error messages
    - Style disabled button states, focus indicators, and edit mode inputs
    - _Requirements: 4.2, 9.2_

- [ ] 12. Wire all modules in `init()` and finalise `index.html`
  - [x] 12.1 Implement the top-level `init()` function and wire it to `DOMContentLoaded` in `js/app.js`
    - Call `GreetingMod.init(...)`, `TimerMod.init(...)`, `TodoMod.init(...)`, `LinksMod.init(...)` with correct DOM element references
    - Ensure all DOM `id` attributes in `index.html` match what each module's `init` expects
    - _Requirements: 9.1, 10.2, 10.3_
  - [~] 12.2 Verify the app loads correctly via `file://` protocol with no build step or server
    - Open `index.html` directly in a browser; confirm all four widgets render, clock ticks, timer controls work, tasks and links persist across reload
    - Fix any path or MIME-type issues caused by the `file://` protocol
    - _Requirements: 10.3, 10.4_

- [~] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests (Properties 1–20) validate universal correctness guarantees; unit tests validate specific examples and edge cases
- fast-check is loaded from `js/vendor/fast-check.umd.js` to satisfy Requirement 10.4 (no CDN assets)
- All four modules (`GreetingMod`, `TimerMod`, `TodoMod`, `LinksMod`) live in a single `js/app.js` file per Requirement 10.2
- WCAG 2.1 AA contrast ratios and responsive layout (Requirements 9.4, 9.5) require manual verification with browser DevTools and an accessibility audit tool (e.g., axe, Lighthouse) in addition to automated checks

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "3.1"] },
    { "id": 2, "tasks": ["2.3", "4.1", "5.1"] },
    { "id": 3, "tasks": ["4.2", "5.2", "5.3", "7.1"] },
    { "id": 4, "tasks": ["5.4", "7.2", "7.3", "9.1"] },
    { "id": 5, "tasks": ["7.4", "9.2", "10.1", "10.2", "10.3", "11.1"] },
    { "id": 6, "tasks": ["11.2", "11.3", "12.1"] },
    { "id": 7, "tasks": ["12.2"] }
  ]
}
```
