/* js/app.js — To-Do Life Dashboard application code */

/* ─────────────────────────────────────────────
   uuid() — Universally-unique ID helper
   Uses crypto.randomUUID() when available; falls
   back to a Math.random()-based v4 UUID otherwise.
───────────────────────────────────────────────── */
function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/* ─────────────────────────────────────────────
   StorageMod — localStorage wrapper
   Centralises all read/write operations under the
   two storage keys used by this application.
   Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
───────────────────────────────────────────────── */
const StorageMod = {
  TASKS_KEY: 'dashboard_tasks',
  LINKS_KEY: 'dashboard_links',

  /**
   * Show a non-blocking error notice.
   * Delegates to NotificationMod when available;
   * falls back to console.error until NotificationMod is defined.
   * @param {string} message
   */
  showError(message) {
    if (typeof NotificationMod !== 'undefined') {
      NotificationMod.show(document.body, message);
    } else {
      console.error(message);
    }
  },

  /**
   * Read and JSON-parse a value from localStorage.
   * Returns [] on any error (missing key, quota, bad JSON, etc.).
   * @param {string} key
   * @returns {any}
   */
  _read(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return [];
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  },

  /**
   * JSON-stringify and write a value to localStorage.
   * Catches QuotaExceededError (and any other error) and calls showError.
   * @param {string} key
   * @param {any} value
   * @returns {boolean} true on success, false on failure
   */
  _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      const msg = (e && e.name === 'QuotaExceededError')
        ? 'Unable to save data — storage full'
        : 'Unable to save data';
      StorageMod.showError(msg);
      return false;
    }
  },

  /**
   * Read the persisted tasks array.
   * @returns {Task[]}
   */
  readTasks() {
    return StorageMod._read(StorageMod.TASKS_KEY) || [];
  },

  /**
   * Read the persisted links array.
   * @returns {Link[]}
   */
  readLinks() {
    return StorageMod._read(StorageMod.LINKS_KEY) || [];
  },

  /**
   * Persist the tasks array.
   * @param {Task[]} tasks
   * @returns {boolean}
   */
  writeTasks(tasks) {
    return StorageMod._write(StorageMod.TASKS_KEY, tasks);
  },

  /**
   * Persist the links array.
   * @param {Link[]} links
   * @returns {boolean}
   */
  writeLinks(links) {
    return StorageMod._write(StorageMod.LINKS_KEY, links);
  },
};

/* ─────────────────────────────────────────────
   NotificationMod — Non-blocking inline notices
   Requirements: 3.6, 4.5, 6.5, 8.5
───────────────────────────────────────────────── */
const NotificationMod = {
  /**
   * Show a non-blocking notice inside `container`.
   * @param {HTMLElement} container
   * @param {string} message
   * @param {number} [durationMs=3000]
   */
  show(container, message, durationMs = 3000) {
    const p = document.createElement('p');
    p.className = 'notice';
    p.textContent = message;
    container.appendChild(p);
    setTimeout(() => {
      if (p.parentNode) p.parentNode.removeChild(p);
    }, durationMs);
  },
};

/* ─────────────────────────────────────────────
   GreetingMod — Real-time clock, date, greeting
   Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
───────────────────────────────────────────────── */
const GreetingMod = {
  _els: null,

  /**
   * Format a Date as HH:MM:SS with zero-padding.
   * @param {Date} date
   * @returns {string}
   */
  formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  },

  /**
   * Format a Date as "Weekday, Month D, YYYY" (e.g. "Monday, July 2, 2025").
   * @param {Date} date
   * @returns {string}
   */
  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },

  /**
   * Return a time-of-day greeting based on the hour (0–23).
   * 0–11  → "Good Morning"
   * 12–17 → "Good Afternoon"
   * 18–23 → "Good Evening"
   * @param {number} hour
   * @returns {string}
   */
  getGreeting(hour) {
    if (hour >= 0 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    return 'Good Evening';
  },

  /**
   * Update the bound DOM elements with the current time, date, and greeting.
   */
  tick() {
    const now = new Date();
    this._els.clock.textContent = this.formatTime(now);
    this._els.date.textContent = this.formatDate(now);
    const name = NameMod.getName();
    const greetingText = this.getGreeting(now.getHours());
    this._els.greeting.textContent = name ? `${greetingText}, ${name}!` : greetingText;
  },

  /**
   * Bind DOM element references, call tick() immediately, then start a 1-second interval.
   * @param {{ clock: HTMLElement, date: HTMLElement, greeting: HTMLElement }} elements
   */
  init({ clock, date, greeting }) {
    this._els = { clock, date, greeting };
    this.tick();
    setInterval(() => this.tick(), 1000);
  },
};

/* ─────────────────────────────────────────────
   TimerMod — Pomodoro-style 25-minute countdown
   Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
───────────────────────────────────────────────── */
const TimerMod = {
  /** Total seconds for one Pomodoro session (25 × 60). */
  INITIAL_SECONDS: 1500,

  /** Seconds remaining in the current session. */
  remainingSeconds: 1500,

  /** Handle returned by setInterval, or null when not running. */
  intervalId: null,

  /**
   * Format a raw seconds value as a zero-padded MM:SS string.
   * Both the minutes and seconds fields are exactly two digits.
   *
   * Examples:
   *   formatDisplay(0)    → "00:00"
   *   formatDisplay(90)   → "01:30"
   *   formatDisplay(1500) → "25:00"
   *
   * @param {number} seconds - Integer in [0, 1500]
   * @returns {string} "MM:SS"
   */
  formatDisplay(seconds) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  },

  /**
   * Bind DOM element references, set initial state, and show idle button layout.
   * @param {{ display: HTMLElement, btnStart: HTMLButtonElement, btnStop: HTMLButtonElement, btnReset: HTMLButtonElement, message: HTMLElement }} elements
   */
  init({ display, btnStart, btnStop, btnReset, message }) {
    this._els = { display, btnStart, btnStop, btnReset, message };
    this.remainingSeconds = 1500;
    this._els.display.textContent = this.formatDisplay(1500);
    this._els.message.textContent = '';
    this._els.message.classList.remove('visible');
    this.updateButtons('idle');
  },

  /**
   * Start the countdown interval.
   * Guard: if already running (intervalId !== null), return immediately to prevent duplicates.
   */
  start() {
    if (this.intervalId !== null) return;
    this.intervalId = setInterval(() => this.tick(), 1000);
    this.updateButtons('running');
  },

  /**
   * Stop (pause) the countdown without resetting state.
   */
  stop() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.updateButtons('idle');
  },

  /**
   * Reset the timer to its initial 25:00 state and clear any completion message.
   */
  reset() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.remainingSeconds = this.INITIAL_SECONDS;
    this._els.display.textContent = this.formatDisplay(this.INITIAL_SECONDS);
    this._els.message.textContent = '';
    this._els.message.classList.remove('visible');
    this.updateButtons('idle');
  },

  /**
   * Called every second by the interval.
   * Decrements remainingSeconds, updates the display, and triggers onComplete at 0.
   */
  tick() {
    this.remainingSeconds -= 1;
    this._els.display.textContent = this.formatDisplay(this.remainingSeconds);
    if (this.remainingSeconds <= 0) {
      this.onComplete();
    }
  },

  /**
   * Called when the countdown reaches zero.
   * Clears the interval, shows "Time's up!", and moves to the done button state.
   */
  onComplete() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this._els.message.textContent = "Time's up!";
    this.updateButtons('done');
  },

  /**
   * Update the disabled state of the three timer buttons based on the current state.
   * @param {'idle'|'running'|'done'} state
   */
  updateButtons(state) {
    const { btnStart, btnStop, btnReset } = this._els;
    if (state === 'idle') {
      btnStart.disabled = false;
      btnStop.disabled  = true;
      btnReset.disabled = false;
    } else if (state === 'running') {
      btnStart.disabled = true;
      btnStop.disabled  = false;
      btnReset.disabled = true;
    } else if (state === 'done') {
      btnStart.disabled = true;
      btnStop.disabled  = true;
      btnReset.disabled = false;
    }
  },
};

/* ─────────────────────────────────────────────
   TodoMod — To-Do List manager
   Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6,
                 4.1, 4.2, 4.3, 4.4, 4.5
───────────────────────────────────────────────── */
const TodoMod = {
  /** In-memory task array. */
  tasks: [],

  /** Bound DOM element references (set in init). */
  _els: null,

  /** ID of the task currently in edit mode, or null if none. */
  _editingId: null,

  /** Current sort mode: 'date' | 'name' | 'status' */
  sortBy: 'date',

  /**
   * Bind DOM refs and wire event listeners, then load persisted tasks.
   * @param {{ list: HTMLElement, input: HTMLInputElement, addBtn: HTMLButtonElement }} elements
   */
  init({ list, input, addBtn }) {
    this._els = { list, input, addBtn };

    // Add button click
    addBtn.addEventListener('click', () => this.addTask(input.value));

    // Enter key on input
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.addTask(input.value);
      }
    });

    // Load saved sort preference
    this.sortBy = localStorage.getItem('todo_sort') || 'date';

    // Wire sort buttons
    const sortDateBtn = document.getElementById('sort-date-btn');
    const sortNameBtn = document.getElementById('sort-name-btn');
    const sortStatusBtn = document.getElementById('sort-status-btn');

    if (sortDateBtn) sortDateBtn.addEventListener('click', () => this.sortTasks('date'));
    if (sortNameBtn) sortNameBtn.addEventListener('click', () => this.sortTasks('name'));
    if (sortStatusBtn) sortStatusBtn.addEventListener('click', () => this.sortTasks('status'));

    this.load();
  },

  /**
   * Load tasks from localStorage and render them.
   * Shows an error notice if the read throws.
   */
  load() {
    try {
      this.tasks = StorageMod.readTasks();
    } catch (e) {
      this.tasks = [];
      NotificationMod.show(this._els.list, 'Could not load tasks');
    }
    this.render();
  },

  /**
   * Add a new task.
   * Trims text; ignores empty/whitespace-only input (retains focus).
   * Caps text at 500 characters, then pushes to tasks[], renders, and saves.
   * @param {string} text
   */
  addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) {
      this._els.input.focus();
      return;
    }
    const capped = trimmed.slice(0, 500);
    this.tasks.push({
      id: uuid(),
      text: capped,
      completed: false,
      createdAt: Date.now(),
    });
    this.render();
    this.save();
    this._els.input.value = '';
  },

  /**
   * Delete a task by id, then render and save.
   * @param {string} id
   */
  deleteTask(id) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.render();
    this.save();
  },

  /**
   * Toggle a task's completed state, then render and save.
   * @param {string} id
   */
  toggleComplete(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
    }
    this.render();
    this.save();
  },

  /**
   * Build a <li> element for a single task, including all controls.
   * If the task is currently in edit mode (task.id === this._editingId),
   * renders the edit view instead of the normal view.
   * @param {{ id: string, text: string, completed: boolean, createdAt: number }} task
   * @returns {HTMLLIElement}
   */
  renderItem(task) {
    const li = document.createElement('li');
    li.dataset.taskId = task.id;

    // ── Edit mode branch ──────────────────────────────────────────────────────
    if (task.id === this._editingId) {
      li.dataset.editing = 'true';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.value = task.text;
      input.maxLength = 500;
      input.setAttribute('aria-label', 'Edit task text');

      const saveBtn = document.createElement('button');
      saveBtn.className = 'save-btn';
      saveBtn.setAttribute('aria-label', 'Save edit');
      saveBtn.textContent = 'Save';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'cancel-edit-btn';
      cancelBtn.setAttribute('aria-label', 'Cancel edit');
      cancelBtn.textContent = 'Cancel';

      // Wire Save button
      saveBtn.addEventListener('click', () => this.confirmEdit(task.id, input.value));

      // Wire Cancel button
      cancelBtn.addEventListener('click', () => this.cancelEdit(task.id));

      // Wire keyboard shortcuts on the input
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.confirmEdit(task.id, input.value);
        } else if (e.key === 'Escape') {
          this.cancelEdit(task.id);
        }
      });

      li.appendChild(input);
      li.appendChild(saveBtn);
      li.appendChild(cancelBtn);

      // Focus the input after the DOM is updated
      setTimeout(() => input.focus(), 0);

      return li;
    }

    // ── Normal view ───────────────────────────────────────────────────────────
    if (task.completed) {
      li.classList.add('task-completed');
    }

    // Text span
    const span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = task.text;
    if (task.completed) {
      span.classList.add('completed');
    }
    // Double-click on text enters edit mode
    span.addEventListener('dblclick', () => this.enterEditMode(task.id));

    // Toggle complete button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn';
    toggleBtn.setAttribute('aria-label', 'Toggle complete');
    toggleBtn.addEventListener('click', () => this.toggleComplete(task.id));

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.addEventListener('click', () => this.enterEditMode(task.id));

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.setAttribute('aria-label', 'Delete task');
    deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

    li.appendChild(span);
    li.appendChild(toggleBtn);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);

    return li;
  },

  /**
   * Clear the list element and re-render all tasks from this.tasks[].
   */
  render() {
    this._els.list.innerHTML = '';
    const sortedTasks = this.getSortedTasks();
    sortedTasks.forEach((task) => {
      this._els.list.appendChild(this.renderItem(task));
    });
    this.updateSortButtons();
  },

  /**
   * Persist the current tasks array to localStorage via StorageMod.
   */
  save() {
    StorageMod.writeTasks(this.tasks);
  },

  /**
   * Enter inline edit mode for the task with the given id.
   * Sets _editingId and triggers a full re-render so renderItem
   * produces the edit UI for that task.
   * @param {string} id
   */
  enterEditMode(id) {
    this._editingId = id;
    this.render();
  },

  /**
   * Confirm an inline edit.
   * If newText is empty/whitespace-only the edit is discarded (same as cancel).
   * Otherwise the task text is updated (capped at 500 chars), edit mode is
   * exited, the list is re-rendered, and the change is persisted.
   * @param {string} id
   * @param {string} newText
   */
  confirmEdit(id, newText) {
    const trimmed = newText.trim();
    if (!trimmed) {
      this.cancelEdit(id);
      return;
    }
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.text = trimmed.slice(0, 500);
    }
    this._editingId = null;
    this.render();
    this.save();
  },

  /**
   * Cancel an inline edit without saving.
   * Clears _editingId and re-renders to restore the normal task view.
   * @param {string} id
   */
  cancelEdit(id) {
    this._editingId = null;
    this.render();
  },

  /**
   * Sort tasks by the given criteria.
   * @param {'date'|'name'|'status'} mode
   */
  sortTasks(mode) {
    this.sortBy = mode;
    localStorage.setItem('todo_sort', mode);
    this.render();
  },

  /**
   * Get sorted tasks array based on current sortBy mode.
   * @returns {Task[]}
   */
  getSortedTasks() {
    const sorted = [...this.tasks];

    if (this.sortBy === 'name') {
      // Sort alphabetically (case-insensitive)
      sorted.sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()));
    } else if (this.sortBy === 'status') {
      // Sort: incomplete first, then completed
      sorted.sort((a, b) => {
        if (a.completed === b.completed) return 0;
        return a.completed ? 1 : -1;
      });
    } else {
      // Default: sort by date created (newest first)
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    }

    return sorted;
  },

  /**
   * Update the active state of sort buttons.
   */
  updateSortButtons() {
    const dateBtn = document.getElementById('sort-date-btn');
    const nameBtn = document.getElementById('sort-name-btn');
    const statusBtn = document.getElementById('sort-status-btn');

    if (dateBtn) dateBtn.classList.toggle('active', this.sortBy === 'date');
    if (nameBtn) nameBtn.classList.toggle('active', this.sortBy === 'name');
    if (statusBtn) statusBtn.classList.toggle('active', this.sortBy === 'status');
  },
};

/* ─────────────────────────────────────────────
   LinksMod — Quick Links manager
   Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6,
                 7.1, 7.2, 7.3, 7.4
───────────────────────────────────────────────── */
const LinksMod = {
  /**
   * Default links seeded on first load when localStorage has no saved data.
   * IDs are string literals so they are stable across reloads before seeding.
   */
  DEFAULT_LINKS: [
    { id: 'default-google',  label: 'Google',  url: 'https://www.google.com'  },
    { id: 'default-github',  label: 'GitHub',  url: 'https://www.github.com'  },
    { id: 'default-youtube', label: 'YouTube', url: 'https://www.youtube.com' },
  ],

  /** In-memory links array. */
  links: [],

  /** Bound DOM element references (set in init). */
  _els: null,

  /**
   * Bind DOM refs and wire event listeners, then load persisted links.
   * @param {{ container: HTMLElement, labelInput: HTMLInputElement, urlInput: HTMLInputElement, addBtn: HTMLButtonElement }} elements
   */
  init({ container, labelInput, urlInput, addBtn }) {
    this._els = { container, labelInput, urlInput, addBtn };

    // Add button click
    addBtn.addEventListener('click', () => {
      this.addLink(labelInput.value, urlInput.value);
    });

    // Enter key on labelInput
    labelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.addLink(labelInput.value, urlInput.value);
      }
    });

    // Enter key on urlInput
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.addLink(labelInput.value, urlInput.value);
      }
    });

    this.load();
  },

  /**
   * Load links from localStorage.
   * If the result is an empty array, seed DEFAULT_LINKS (deep copy with fresh UUIDs) and save.
   * Calls render() after loading. Shows an error notice on any exception and falls back to DEFAULT_LINKS.
   */
  load() {
    try {
      const stored = StorageMod.readLinks();
      if (!stored || stored.length === 0) {
        // Seed default links with fresh UUIDs (deep copy)
        this.links = LinksMod.DEFAULT_LINKS.map((link) => ({
          id: uuid(),
          label: link.label,
          url: link.url,
        }));
        this.save();
      } else {
        this.links = stored;
      }
    } catch (e) {
      NotificationMod.show(this._els.container, 'Could not load links');
      // Fall back to DEFAULT_LINKS with fresh UUIDs
      this.links = LinksMod.DEFAULT_LINKS.map((link) => ({
        id: uuid(),
        label: link.label,
        url: link.url,
      }));
    }
    this.render();
  },

  /**
   * Add a new link.
   * Validates: label must be non-empty after trim; url must pass validateUrl after trim.
   * On invalid input: shows inline validation message and focuses the first invalid field.
   * On valid input: pushes link with uuid(), renders, saves, clears both inputs.
   * @param {string} label
   * @param {string} url
   */
  addLink(label, url) {
    const trimmedLabel = label.trim();
    const trimmedUrl   = url.trim();

    if (!trimmedLabel) {
      NotificationMod.show(this._els.labelInput.parentElement || this._els.container, 'Link label cannot be empty');
      this._els.labelInput.focus();
      return;
    }

    if (!this.validateUrl(trimmedUrl)) {
      NotificationMod.show(this._els.urlInput.parentElement || this._els.container, 'URL must start with http:// or https://');
      this._els.urlInput.focus();
      return;
    }

    this.links.push({
      id: uuid(),
      label: trimmedLabel,
      url: trimmedUrl,
    });

    this.render();
    this.save();

    this._els.labelInput.value = '';
    this._els.urlInput.value   = '';
  },

  /**
   * Delete a link by id, then render and save.
   * @param {string} id
   */
  deleteLink(id) {
    this.links = this.links.filter((link) => link.id !== id);
    this.render();
    this.save();
  },

  /**
   * Open a link in a new browser tab if its URL is valid.
   * Shows an inline "Invalid URL" error via NotificationMod if the URL is invalid.
   * @param {{ id: string, label: string, url: string }} link
   */
  openLink(link) {
    if (this.validateUrl(link.url)) {
      window.open(link.url, '_blank');
    } else {
      NotificationMod.show(this._els.container, 'Invalid URL', 3000);
    }
  },

  /**
   * Validate a URL by checking its protocol prefix.
   * Returns true only if the URL starts with "http://" or "https://".
   * @param {string} url
   * @returns {boolean}
   */
  validateUrl(url) {
    return url.startsWith('http://') || url.startsWith('https://');
  },

  /**
   * Build a <div class="link-item"> element for a single link.
   * The link button displays the label truncated to 30 characters + "…" if longer.
   * Includes a delete button wired to deleteLink.
   * @param {{ id: string, label: string, url: string }} link
   * @returns {HTMLDivElement}
   */
  renderItem(link) {
    const div = document.createElement('div');
    div.className = 'link-item';

    // Link button — truncate label to 30 chars + ellipsis if needed
    const linkBtn = document.createElement('button');
    linkBtn.className = 'link-btn';
    const displayLabel = link.label.length > 30
      ? link.label.slice(0, 30) + '\u2026'   // U+2026 HORIZONTAL ELLIPSIS "…"
      : link.label;
    linkBtn.textContent = displayLabel;
    linkBtn.addEventListener('click', () => this.openLink(link));

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'link-delete-btn';
    deleteBtn.setAttribute('aria-label', 'Delete link');
    deleteBtn.addEventListener('click', () => this.deleteLink(link.id));

    div.appendChild(linkBtn);
    div.appendChild(deleteBtn);

    return div;
  },

  /**
   * Clear the container and re-render all link items from this.links[].
   */
  render() {
    this._els.container.innerHTML = '';
    this.links.forEach((link) => {
      this._els.container.appendChild(this.renderItem(link));
    });
  },

  /**
   * Persist the current links array to localStorage via StorageMod.
   */
  save() {
    StorageMod.writeLinks(this.links);
  },
};

/* ==========================================================
   NAME MODULE — Custom user name
========================================================== */

const NameMod = (() => {

  const STORAGE_KEY = 'user_name';

  /**
   * Get the stored user name or empty string
   */
  function getName() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  /**
   * Save the user name to localStorage
   */
  function setName(name) {
    const trimmed = name.trim().slice(0, 100);
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    // Update greeting
    GreetingMod.tick();
  }

  /**
   * Show a modal to get the user's name
   */
  function showModal() {
    const currentName = getName();
    const newName = prompt('Enter your name:', currentName);
    
    if (newName !== null) {
      setName(newName);
      NotificationMod.show(
        document.body,
        newName.trim() ? `Welcome, ${newName.trim()}!` : 'Name cleared',
        2000
      );
    }
  }

  /**
   * Initialize the name module
   */
  function init() {
    const btn = document.getElementById('greeting-name-btn');
    if (btn) {
      btn.addEventListener('click', showModal);
    }
  }

  return {
    init,
    getName,
    setName,
  };

})();

/* ==========================================================
   THEME MODULE
========================================================== */

const ThemeMod = (() => {

    const STORAGE_KEY = "theme";

    const button = () => document.getElementById("theme-toggle");

    function applyTheme(theme){

        if(theme === "light"){
            document.body.classList.add("light-mode");

            if(button()) button().textContent = "☀️";
        }else{
            document.body.classList.remove("light-mode");

            if(button()) button().textContent = "🌙";
        }

    }

    function loadTheme(){

        const savedTheme = localStorage.getItem(STORAGE_KEY) || "dark";

        applyTheme(savedTheme);

    }

    function toggleTheme(){

        const isLight =
            document.body.classList.contains("light-mode");

        const newTheme = isLight ? "dark" : "light";

        localStorage.setItem(STORAGE_KEY,newTheme);

        applyTheme(newTheme);

    }

    function init(){

        console.log("Theme Loaded");

        loadTheme();

        const btn = button();

        if(btn){

            btn.addEventListener("click",toggleTheme);

        }

    }

    return{

        init

    };

})();

/* ─────────────────────────────────────────────
   Application bootstrap
   Wires all modules to their DOM elements on load.
   Requirements: 9.1, 10.2, 10.3
───────────────────────────────────────────────── */
function init() {

  NameMod.init();

  ThemeMod.init();

  GreetingMod.init({
    clock:   document.getElementById('greeting-clock'),
    date:    document.getElementById('greeting-date'),
    greeting: document.getElementById('greeting-text'),
  });

  TimerMod.init({
    display:  document.getElementById('timer-display'),
    btnStart: document.getElementById('timer-btn-start'),
    btnStop:  document.getElementById('timer-btn-stop'),
    btnReset: document.getElementById('timer-btn-reset'),
    message:  document.getElementById('timer-message'),
  });

  TodoMod.init({
    list:   document.getElementById('todo-list'),
    input:  document.getElementById('todo-input'),
    addBtn: document.getElementById('todo-add-btn'),
  });

  LinksMod.init({
    container:  document.getElementById('links-container'),
    labelInput: document.getElementById('links-label-input'),
    urlInput:   document.getElementById('links-url-input'),
    addBtn:     document.getElementById('links-add-btn'),
  });
}

document.addEventListener('DOMContentLoaded', init);
