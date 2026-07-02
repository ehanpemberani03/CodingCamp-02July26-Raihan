# Requirements Document

## Introduction

The To-Do Life Dashboard is a client-side web application that serves as a personal daily organizer and browser homepage. It provides users with a real-time clock and greeting, a Pomodoro-style focus timer, a persistent to-do list, and a collection of quick-access website links — all built with HTML, CSS, and vanilla JavaScript, with data stored in the browser's Local Storage. No backend or build tools are required.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI section displaying the current time, date, and a time-based greeting message.
- **Focus_Timer**: The countdown timer widget based on a 25-minute Pomodoro session.
- **Todo_List**: The UI section for managing tasks (add, edit, complete, delete).
- **Task**: A single item in the Todo_List with a text description and a completion state.
- **Quick_Links**: The UI section displaying user-defined shortcut buttons that open external URLs.
- **Link**: A single entry in Quick_Links consisting of a label and a URL.
- **Local_Storage**: The browser's `localStorage` API used for all client-side data persistence.
- **User**: The person interacting with the Dashboard in a modern web browser.

---

## Requirements

### Requirement 1: Greeting Widget

**User Story:** As a user, I want to see the current time, date, and a personalized greeting when I open the Dashboard, so that I feel oriented and welcomed at the start of my day.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM:SS format, updated every second using `setInterval` with a 1000 ms interval.
2. THE Greeting_Widget SHALL display the current date as a string containing the full weekday name, full month name, numeric day, and four-digit year (e.g., "Monday, July 2, 2025"), derived from the browser's local time zone.
3. WHEN the current local hour (0–23) is in the range 0–11 inclusive, THE Greeting_Widget SHALL display the greeting text "Good Morning".
4. WHEN the current local hour (0–23) is in the range 12–17 inclusive, THE Greeting_Widget SHALL display the greeting text "Good Afternoon".
5. WHEN the current local hour (0–23) is in the range 18–23 inclusive, THE Greeting_Widget SHALL display the greeting text "Good Evening".
6. WHEN the local hour changes (e.g., from 11 to 12), THE Greeting_Widget SHALL update the greeting text on the next `setInterval` tick without requiring a page reload.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with Start, Stop, and Reset controls, so that I can manage focused work sessions without distraction.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialise with a countdown value of 25 minutes (displayed as "25:00") when the page loads or after Reset is activated.
2. WHEN the user activates the Start control, THE Focus_Timer SHALL begin counting down in one-second decrements using `setInterval` with a 1000 ms interval.
3. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL update the displayed MM:SS value every second, zero-padding both the minutes and seconds fields to two digits.
4. WHEN the user activates the Stop control, THE Focus_Timer SHALL clear the active interval, pause the countdown, and retain the current remaining time in memory.
5. WHEN the user activates the Reset control, THE Focus_Timer SHALL clear any active interval and restore the displayed value to "25:00" and the internal remaining-time value to 1500 seconds.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL clear the active interval, stop the countdown, and display a visible on-page message (e.g., "Time's up!") that persists until the user activates the Reset control.
7. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL disable the Start control (set its `disabled` attribute to `true`) to prevent duplicate intervals.
8. WHILE the Focus_Timer is in the initial or paused state, THE Focus_Timer SHALL disable the Stop control (set its `disabled` attribute to `true`).
9. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL disable both the Start and Stop controls and enable only the Reset control.

---

### Requirement 3: To-Do List — Add and Display Tasks

**User Story:** As a user, I want to add tasks to a list and see them displayed immediately, so that I can track everything I need to do today.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a text input field and an Add button for entering new tasks.
2. WHEN the user submits a non-empty task text (after trimming leading and trailing whitespace) via the Add button or the Enter key, THE Todo_List SHALL append the new Task to the bottom of the list, clear the input field, and persist the updated task array to Local_Storage. Task text SHALL be capped at 500 characters; any input exceeding this limit SHALL be truncated to 500 characters before saving.
3. IF the user attempts to submit an empty or whitespace-only input, THEN THE Todo_List SHALL ignore the submission and retain focus on the input field without adding a task or modifying Local_Storage.
4. THE Todo_List SHALL display each Task with its description text, a completion toggle control, an edit control, and a delete control.
5. WHEN the Dashboard is loaded, THE Todo_List SHALL restore all previously saved Tasks from Local_Storage and display them in insertion order (the order in which they were originally added).
6. IF Local_Storage is unavailable or throws an exception during the load operation, THEN THE Todo_List SHALL initialise with an empty task array and display a non-blocking error notice to the user.

---

### Requirement 4: To-Do List — Complete and Delete Tasks

**User Story:** As a user, I want to mark tasks as done and remove tasks I no longer need, so that I can maintain an accurate and clean to-do list.

#### Acceptance Criteria

1. WHEN the user activates the completion toggle on a Task, THE Todo_List SHALL toggle the Task's completion state between complete and incomplete and persist the updated task array to Local_Storage within 500 ms.
2. WHILE a Task is in the complete state, THE Todo_List SHALL render the Task with strikethrough text styling (`text-decoration: line-through`) and reduced opacity (≤ 0.6) to distinguish it visually from incomplete tasks.
3. WHEN the user activates the delete control on a Task, THE Todo_List SHALL permanently remove that Task from the list and from Local_Storage within 500 ms.
4. WHEN any Task state changes (add, complete/incomplete toggle, delete), THE Todo_List SHALL persist the entire updated task array to Local_Storage within 500 ms of the change.
5. IF a Local_Storage write operation fails (e.g., quota exceeded or access denied), THEN THE Todo_List SHALL display a non-blocking error notice to the user and retain the in-memory state so the current session is not disrupted.

---

### Requirement 5: To-Do List — Edit Tasks

**User Story:** As a user, I want to edit the text of an existing task inline, so that I can correct mistakes or update task descriptions without deleting and re-adding.

#### Acceptance Criteria

1. WHEN the user activates the edit control on a Task (by clicking the edit button or double-clicking the task text), THE Todo_List SHALL replace the Task's text display with an editable `<input>` field pre-populated with the current task text and move focus to that input field.
2. WHILE a Task is in edit mode, THE Todo_List SHALL display a Save button (or respond to the Enter key) to confirm the edit, and a Cancel button (or respond to the Escape key) to discard the edit.
3. WHEN the user confirms the edit (via Save button or Enter key) with a non-empty, non-whitespace-only value, THE Todo_List SHALL trim the input, update the Task's stored text, exit edit mode (restoring the text display), and persist the change to Local_Storage.
4. IF the user confirms the edit with an empty or whitespace-only value, THEN THE Todo_List SHALL discard the change, restore the original task text in the display, exit edit mode, and make no modification to Local_Storage.
5. WHEN the user cancels the edit (via Cancel button or Escape key), THE Todo_List SHALL discard any typed changes, restore the original task text in the display, and exit edit mode without modifying Local_Storage.
6. Task text input during editing SHALL be capped at 500 characters; any input exceeding this limit SHALL be truncated to 500 characters upon save.

---

### Requirement 6: Quick Links — Display and Open

**User Story:** As a user, I want to see my saved quick-access links as clickable buttons, so that I can navigate to my favourite websites with one click.

#### Acceptance Criteria

1. THE Quick_Links SHALL display each saved Link as a button labelled with the Link's saved name; IF the label exceeds 30 characters, THE Quick_Links SHALL truncate the displayed label to 30 characters and append an ellipsis ("…").
2. WHEN the user activates a Link button whose URL starts with `http://` or `https://`, THE Quick_Links SHALL open that URL in a new browser tab (`target="_blank"`).
3. WHEN the user activates a Link button whose URL does not start with `http://` or `https://`, THE Quick_Links SHALL NOT open any tab and SHALL display a non-blocking inline error message adjacent to the link (e.g., "Invalid URL") that disappears after 3 seconds.
4. WHEN the Dashboard is loaded and Local_Storage is readable, THE Quick_Links SHALL restore all previously saved Links from Local_Storage and render them as buttons before the first user interaction.
5. IF Local_Storage is unavailable or returns invalid data during load, THE Quick_Links SHALL display a non-blocking error notice and fall back to the default link set.
6. IF Local_Storage contains no saved Links on first load (key is absent or the stored array is empty), THEN THE Quick_Links SHALL seed and display the following default links: Google (https://www.google.com), GitHub (https://www.github.com), YouTube (https://www.youtube.com).

---

### Requirement 7: Quick Links — Add and Delete Links

**User Story:** As a user, I want to add new quick-access links and remove ones I no longer need, so that my link collection stays relevant.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide a text input for the link label (max 100 characters) and a text input for the URL (max 2048 characters), plus an Add button.
2. WHEN the user submits a non-empty label and a URL that starts with `http://` or `https://`, THE Quick_Links SHALL append the new Link to the list, persist it to Local_Storage, and clear both input fields.
3. IF the user submits with an empty label, an empty URL, or a URL that does not start with `http://` or `https://`, THEN THE Quick_Links SHALL ignore the submission, display an inline validation message identifying the invalid field(s), and retain focus on the first invalid field.
4. WHEN the user activates the delete control on a Link, THE Quick_Links SHALL permanently remove that Link from the list and from Local_Storage.

---

### Requirement 8: Data Persistence

**User Story:** As a user, I want my tasks and quick links to be saved automatically, so that my data is restored every time I open the Dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL use the browser Local_Storage API as the sole persistence mechanism; no remote API calls or IndexedDB usage is permitted.
2. WHEN a Task is created, updated, or deleted, THE Dashboard SHALL serialise the current task array as a JSON string and write it to Local_Storage under the key `dashboard_tasks`.
3. WHEN a Link is created or deleted, THE Dashboard SHALL serialise the current link array as a JSON string and write it to Local_Storage under the key `dashboard_links`.
4. WHEN the Dashboard reads from Local_Storage and the stored value is absent (key returns `null`) or is not valid JSON, THE Dashboard SHALL discard the value, initialise the corresponding array as empty `[]`, and continue normal operation without throwing an unhandled exception.
5. IF a Local_Storage write operation throws a `QuotaExceededError` or any other storage exception, THE Dashboard SHALL catch the exception, display a non-blocking error notice to the user (e.g., "Unable to save data — storage full"), and retain the current in-memory state for the remainder of the session.

---

### Requirement 9: Layout and Visual Design

**User Story:** As a user, I want a clean, readable, and visually consistent Dashboard layout, so that I can use it comfortably as a daily homepage.

#### Acceptance Criteria

1. THE Dashboard SHALL present all four widgets (Greeting_Widget, Focus_Timer, Todo_List, Quick_Links) on a single HTML page without requiring navigation between pages.
2. THE Dashboard SHALL apply a consistent visual style defined in a single external CSS file; all visual styling SHALL be contained in that file with no inline `style` attributes on HTML elements except those set dynamically by JavaScript.
3. THE Dashboard SHALL use a layout that organises widgets in a grid or sectioned arrangement with a minimum of 16px gap between adjacent widget boundaries, providing clear visual separation.
4. THE Dashboard SHALL use body text at a minimum font size of 16px and SHALL maintain a colour contrast ratio of at least 4.5:1 between normal text and its background, and at least 3:1 between large text (≥ 18px bold or ≥ 24px regular) and its background, in accordance with WCAG 2.1 Level AA.
5. WHERE the viewport width is 768px or below, THE Dashboard SHALL reflow all widgets into a single-column stacked arrangement and SHALL produce no horizontal scrollbar at that viewport width.

---

### Requirement 10: Code Structure

**User Story:** As a developer, I want the codebase to follow a clean, single-file-per-type structure, so that the project is easy to read, maintain, and extend.

#### Acceptance Criteria

1. THE Dashboard SHALL contain exactly one CSS file located at `css/style.css`; no other `.css` files shall exist in the project.
2. THE Dashboard SHALL contain exactly one JavaScript file located at `js/app.js`; no other `.js` files shall exist in the project.
3. THE Dashboard SHALL be fully functional when `index.html` is opened directly in a browser via the `file://` protocol, with no local server, build step, or package installation required.
4. THE Dashboard SHALL not load any JavaScript, CSS, font, or other asset from an external domain (CDN or otherwise); all assets SHALL be either inline in `index.html` or served from the local project directory.
