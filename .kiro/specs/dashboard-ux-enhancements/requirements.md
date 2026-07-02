# Requirements Document

## Introduction

This document specifies three UX enhancement features for the existing To-Do Life Dashboard. The Dashboard is a vanilla HTML/CSS/JS single-page application with no build tools or frameworks. The three additions are:

1. **Light/Dark Mode Toggle** — a UI control that switches the Dashboard between a light and dark colour theme, with the chosen preference persisted to `localStorage`.
2. **Custom Name in Greeting** — a mechanism for the user to enter their name so the Greeting_Widget displays "Good Morning, [Name]!" (or the appropriate time-of-day salutation) instead of the bare greeting.
3. **Sort Tasks** — controls that allow the user to re-order the to-do list by a chosen criterion without permanently altering the underlying task data.

These requirements extend the existing requirements (1–10) without modifying them. Requirement numbering continues from 11.

## Glossary

All terms defined in the original requirements document apply here. The following additional terms are introduced:

- **Theme**: A named set of CSS custom-property values that controls the colour palette of the Dashboard. Two themes are defined: `dark` (the existing default) and `light`.
- **Theme_Toggle**: The UI control (button or switch) that switches the active Theme between `dark` and `light`.
- **Name_Input**: The UI control (text input + confirm button) that lets the user enter their display name for the greeting.
- **Display_Name**: The user-supplied string shown after the time-of-day salutation in the Greeting_Widget (e.g., "Alice" in "Good Morning, Alice!").
- **Sort_Control**: The UI element (e.g., a `<select>` dropdown) through which the user selects a sort criterion for the to-do list.
- **Sort_Order**: The current ordering criterion applied to the rendered task list. One of: `date-added` (default), `alphabetical`, or `completion-status`.
- **StorageMod**: The existing `localStorage` wrapper module defined in `js/app.js`.
- **GreetingMod**: The existing greeting/clock module defined in `js/app.js`.
- **TodoMod**: The existing to-do list module defined in `js/app.js`.

---

## Requirements

### Requirement 11: Light/Dark Mode Toggle

**User Story:** As a user, I want to switch the Dashboard between a dark and a light colour theme, so that I can choose a visual style that suits my environment or preference, and have that choice remembered across sessions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a Theme_Toggle control visible on every page load, positioned in a persistent location (e.g., a fixed top-right corner overlay or inside the Greeting_Widget header area) such that it does not overlap or occlude any other widget content at any supported viewport width; the control SHALL have a defined `z-index` sufficient to keep it above the page background but below any modal or notice elements.
2. WHEN the user activates the Theme_Toggle, THE Dashboard SHALL switch the active Theme from `dark` to `light`, or from `light` to `dark`, updating the visual appearance of all widgets and the page background without reloading the page.
3. THE Dashboard SHALL implement theming exclusively via a set of CSS custom properties (CSS variables) declared on a root selector or a `data-theme` attribute; no inline `style` attributes shall be set on HTML elements by JavaScript except for the `data-theme` attribute on `<body>` or `<html>`.
4. THE light Theme SHALL define colours such that all normal body text (< 18px regular or < 18px bold) maintains a colour contrast ratio of at least 4.5:1 against its immediate background, and all large text (≥ 18px bold or ≥ 24px regular) maintains at least 3:1 against its immediate background, in accordance with WCAG 2.1 Level AA; these ratios SHALL be verifiable against the light-Theme CSS custom-property values without runtime measurement.
5. WHEN the user activates the Theme_Toggle, THE Dashboard SHALL persist the chosen Theme name (`"dark"` or `"light"`) as a JSON string to `localStorage` under the key `dashboard_theme` via StorageMod within 500 ms.
6. WHEN the Dashboard loads, THE Dashboard SHALL read the `dashboard_theme` key from `localStorage` via an inline `<script>` placed in `<head>` before any stylesheet `<link>` element; IF a valid value (`"dark"` or `"light"`) is found, THE Dashboard SHALL set the `data-theme` attribute on `<html>` synchronously before any stylesheet is parsed, so that no flash of the wrong theme occurs.
7. IF the `dashboard_theme` key is absent, contains `null`, or contains a value that is neither `"dark"` nor `"light"`, THE Dashboard SHALL default to the `dark` Theme.
8. WHEN the user activates the Theme_Toggle, THE Theme_Toggle label or icon SHALL update within one rendering frame (≤ 16 ms) to indicate the Theme it will switch TO next (e.g., display "☀ Light" when the current theme is dark and will switch to light; display "🌙 Dark" when the current theme is light and will switch to dark).
9. THE Theme_Toggle SHALL be keyboard-accessible: it SHALL be reachable via the Tab key and activatable via the Enter or Space key.
10. IF a `localStorage` write for `dashboard_theme` throws a `QuotaExceededError` or any other storage exception, THE Dashboard SHALL catch the exception, display a non-blocking error notice to the user via NotificationMod, and retain the in-memory theme state for the remainder of the session without reverting the visual theme change.

---

### Requirement 12: Custom Name in Greeting

**User Story:** As a user, I want to enter my name so the Dashboard greets me personally (e.g., "Good Morning, Alice!"), so that the Dashboard feels tailored to me, and have that name remembered across sessions.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL provide a Name_Input control — consisting of a text input field and a confirm button — through which the user can enter or update their Display_Name.
2. WHEN the user submits a non-empty Display_Name (after trimming leading and trailing whitespace) via the confirm button or the Enter key on the Name_Input field, THE Greeting_Widget SHALL update the greeting text to the format "[Salutation], [Display_Name]!" (e.g., "Good Morning, Alice!") immediately.
3. THE Greeting_Widget SHALL continue updating the salutation portion of the greeting (Good Morning / Good Afternoon / Good Evening) on every `setInterval` tick as defined in Requirement 1, so that a Display_Name combined with the salutation always reflects the current time of day.
4. WHEN the user submits a non-empty Display_Name, THE Dashboard SHALL persist the Display_Name string to `localStorage` under the key `dashboard_name` via StorageMod within 500 ms.
5. WHEN the Dashboard loads, THE Dashboard SHALL read the `dashboard_name` key from `localStorage`; IF a non-empty string is found, THE Greeting_Widget SHALL immediately display the greeting in the personalised format "[Salutation], [Display_Name]!" without requiring any user interaction.
6. IF the `dashboard_name` key is absent, contains `null`, or contains an empty string, THE Greeting_Widget SHALL display only the bare salutation (e.g., "Good Morning") as defined in Requirements 1.3–1.5.
7. IF the user submits an empty or whitespace-only value in the Name_Input field, THEN THE Greeting_Widget SHALL retain the current greeting format (personalised if a name was already set, bare otherwise) and SHALL make no change to `localStorage`.
8. THE Display_Name SHALL be capped at 50 characters; any input exceeding this limit SHALL be truncated to 50 characters before the greeting is updated and before the value is written to `localStorage`.
9. THE Name_Input field SHALL be pre-populated with the current Display_Name (if one is stored) when the Dashboard loads, so the user can see and edit the saved value without retyping it.
10. THE Name_Input control SHALL be keyboard-accessible: the input field and confirm button SHALL be reachable via the Tab key, and the confirm button SHALL be activatable via the Enter or Space key.

---

### Requirement 13: Sort Tasks

**User Story:** As a user, I want to sort my to-do list by different criteria (date added, alphabetically, or by completion status), so that I can find and prioritise tasks more easily.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a Sort_Control — a labelled `<select>` element — with at least the following options: "Date Added" (value `date-added`), "Alphabetical (A→Z)" (value `alphabetical`), and "Completion Status" (value `completion-status`).
2. WHEN the user changes the Sort_Control selection, THE Todo_List SHALL immediately re-render the visible task list in the chosen Sort_Order without modifying the underlying task array stored in `localStorage`.
3. WHEN Sort_Order is `date-added`, THE Todo_List SHALL render tasks in ascending order of their `createdAt` timestamp (oldest task first), which is the default insertion order.
4. WHEN Sort_Order is `alphabetical`, THE Todo_List SHALL render tasks sorted by their text value using a case-insensitive lexicographic comparison (locale-aware, equivalent to `localeCompare` with default locale).
5. WHEN Sort_Order is `completion-status`, THE Todo_List SHALL render incomplete tasks before complete tasks; within each group, tasks SHALL retain their relative `date-added` order.
6. WHEN a task is added, edited, deleted, or toggled while a non-default Sort_Order is active, THE Todo_List SHALL re-render the list applying the currently active Sort_Order so the display remains consistent with the selected sort criterion.
7. THE Sort_Control SHALL default to the `date-added` option when the Dashboard first loads or when `localStorage` contains no saved sort preference.
8. WHEN the user changes the Sort_Control selection, THE Dashboard SHALL persist the chosen Sort_Order value to `localStorage` under the key `dashboard_sort` via StorageMod within 500 ms.
9. WHEN the Dashboard loads, THE Dashboard SHALL read the `dashboard_sort` key from `localStorage`; IF a valid Sort_Order value is found, THE Sort_Control SHALL be initialised to that value and the task list SHALL be rendered in that order.
10. IF the `dashboard_sort` key is absent, contains `null`, or contains an unrecognised value, THE Todo_List SHALL default to the `date-added` Sort_Order.
11. THE Sort_Control SHALL be keyboard-accessible: it SHALL be reachable via the Tab key and operable via keyboard navigation (arrow keys to change selection) as provided natively by the `<select>` element.
