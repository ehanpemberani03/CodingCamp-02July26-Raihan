/**
 * tests/integration/persistence.test.js
 * Integration tests: session persistence and storage error recovery.
 *
 * Task 10.1 — Persistence session integration test
 *   Validates: Requirements 3.5, 6.4, 8.2, 8.3
 *
 * Task 10.3 — Storage error recovery integration test
 *   Validates: Requirements 4.5, 8.5
 *
 * Run by opening tests/integration/persistence.test.html in a browser.
 * All modules (StorageMod, TodoMod, LinksMod, NotificationMod) are loaded
 * from js/app.js via the HTML runner before this file executes.
 */

/* ─────────────────────────────────────────────────────────────────
   Minimal test harness
   Provides: describe(), it(), assert(), assertEqual(), assertDeepEqual()
   Results are rendered into #test-results and echoed to console.
───────────────────────────────────────────────────────────────────── */
(function buildHarness() {
  const results = [];
  let currentSuite = '';

  window.describe = function describe(suiteName, fn) {
    currentSuite = suiteName;
    fn();
    currentSuite = '';
  };

  window.it = function it(testName, fn) {
    const label = currentSuite ? `${currentSuite} › ${testName}` : testName;
    try {
      fn();
      results.push({ label, passed: true });
      console.log(`  ✓ ${label}`);
    } catch (err) {
      results.push({ label, passed: false, error: err.message || String(err) });
      console.error(`  ✗ ${label}\n    ${err.message || err}`);
    }
  };

  window.assert = function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  };

  window.assertEqual = function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(
        (message ? message + '\n    ' : '') +
        `Expected: ${JSON.stringify(expected)}\n    Got:      ${JSON.stringify(actual)}`
      );
    }
  };

  window.assertDeepEqual = function assertDeepEqual(actual, expected, message) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
      throw new Error(
        (message ? message + '\n    ' : '') +
        `Expected: ${e}\n    Got:      ${a}`
      );
    }
  };

  /** Render results table into #test-results after all suites run. */
  window.renderResults = function renderResults() {
    const container = document.getElementById('test-results');
    if (!container) return;

    const passed  = results.filter(r => r.passed).length;
    const failed  = results.filter(r => !r.passed).length;
    const total   = results.length;

    const summary = document.createElement('p');
    summary.className = failed === 0 ? 'summary pass' : 'summary fail';
    summary.textContent = `${total} tests — ${passed} passed, ${failed} failed`;
    container.appendChild(summary);

    results.forEach(r => {
      const div = document.createElement('div');
      div.className = r.passed ? 'test-item pass' : 'test-item fail';
      div.innerHTML = `<span class="icon">${r.passed ? '✓' : '✗'}</span> ${r.label}` +
        (r.error ? `<pre class="error">${r.error}</pre>` : '');
      container.appendChild(div);
    });

    console.log(`\n=== ${passed}/${total} tests passed ===`);
  };
}());

/* ─────────────────────────────────────────────────────────────────
   localStorage mock factory
   Returns an isolated in-memory store with an optional quota-exceed
   flag so write-failure tests don't touch the real localStorage.
───────────────────────────────────────────────────────────────────── */
function makeLocalStorageMock(options) {
  options = options || {};
  const store = {};
  let throwOnWrite = options.throwOnWrite || false;

  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      if (throwOnWrite) {
        const err = new Error('QuotaExceededError: The quota has been exceeded.');
        err.name = 'QuotaExceededError';
        throw err;
      }
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach(k => delete store[k]);
    },
    /** Test helper: enable / disable the quota-exceeded mode. */
    setThrowOnWrite(value) { throwOnWrite = value; },
    /** Test helper: read raw string without triggering quota check. */
    _getRaw(key) { return store[key] !== undefined ? store[key] : null; },
    _store: store,
  };
}

/* ─────────────────────────────────────────────────────────────────
   Helper: swap window.localStorage with a mock for the duration of
   a test, then restore the original.
   Returns a reset() function to call after the test.
───────────────────────────────────────────────────────────────────── */
function withMockStorage(mock) {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage') ||
    { get: () => window.localStorage, configurable: true };

  Object.defineProperty(window, 'localStorage', {
    value: mock,
    configurable: true,
    writable: true,
  });

  return function restore() {
    // Restore via the original descriptor
    try {
      Object.defineProperty(window, 'localStorage', original);
    } catch (_) {
      // In some browsers the descriptor is non-configurable; leave as-is.
    }
  };
}

/* ─────────────────────────────────────────────────────────────────
   Helper: build a minimal DOM fragment that satisfies TodoMod.init()
   and LinksMod.init() so we can call them without a full page.
───────────────────────────────────────────────────────────────────── */
function buildDOMFixture() {
  const fixture = document.createElement('div');
  fixture.innerHTML = `
    <ul id="f-todo-list"></ul>
    <input id="f-todo-input" type="text" />
    <button id="f-todo-add-btn">Add</button>
    <div id="f-links-container"></div>
    <input id="f-links-label-input" type="text" />
    <input id="f-links-url-input" type="text" />
    <button id="f-links-add-btn">Add Link</button>
  `;
  document.body.appendChild(fixture);
  return {
    fixture,
    todoEls: {
      list:   fixture.querySelector('#f-todo-list'),
      input:  fixture.querySelector('#f-todo-input'),
      addBtn: fixture.querySelector('#f-todo-add-btn'),
    },
    linksEls: {
      container:  fixture.querySelector('#f-links-container'),
      labelInput: fixture.querySelector('#f-links-label-input'),
      urlInput:   fixture.querySelector('#f-links-url-input'),
      addBtn:     fixture.querySelector('#f-links-add-btn'),
    },
  };
}

/** Remove the fixture and reset module state between tests. */
function teardown(fixture) {
  if (fixture && fixture.parentNode) fixture.parentNode.removeChild(fixture);
  // Reset in-memory module state
  TodoMod.tasks    = [];
  TodoMod._els     = null;
  TodoMod._editingId = null;
  LinksMod.links   = [];
  LinksMod._els    = null;
}

/* ═════════════════════════════════════════════════════════════════
   TASK 10.1 — Persistence session integration test
   Validates: Requirements 3.5, 6.4, 8.2, 8.3

   Scenario:
     1. Initialise TodoMod and LinksMod against an isolated mock store.
     2. Add tasks and links (simulating user interactions).
     3. Serialise to the mock localStorage via the real StorageMod path.
     4. Re-read by calling StorageMod.readTasks() / StorageMod.readLinks()
        (simulating a "page reload" re-read from localStorage).
     5. Verify all data is restored in original insertion order with all
        fields intact.
═════════════════════════════════════════════════════════════════ */
describe('Task 10.1 — Persistence session integration', function () {

  it('serialises tasks added via TodoMod and restores them in insertion order (Req 3.5, 8.2)', function () {
    const mock    = makeLocalStorageMock();
    const restore = withMockStorage(mock);
    const { fixture, todoEls } = buildDOMFixture();

    try {
      TodoMod.init(todoEls);

      // Add three tasks in order
      TodoMod.addTask('Buy groceries');
      TodoMod.addTask('Read a book');
      TodoMod.addTask('Write tests');

      // Confirm in-memory state
      assertEqual(TodoMod.tasks.length, 3, 'in-memory tasks count should be 3');

      // Confirm something was written to the mock store
      const raw = mock._getRaw(StorageMod.TASKS_KEY);
      assert(raw !== null, 'dashboard_tasks key should be present in localStorage');

      // Simulate page reload: re-read from the same mock store
      const restored = StorageMod.readTasks();
      assertEqual(restored.length, 3, 'restored tasks count should be 3');

      // Verify insertion order and text values
      assertEqual(restored[0].text, 'Buy groceries', 'first restored task text');
      assertEqual(restored[1].text, 'Read a book',   'second restored task text');
      assertEqual(restored[2].text, 'Write tests',   'third restored task text');

      // Verify createdAt timestamps are present and ordered
      assert(typeof restored[0].createdAt === 'number', 'createdAt should be a number');
      assert(restored[0].createdAt <= restored[1].createdAt, 'createdAt should be non-decreasing');
      assert(restored[1].createdAt <= restored[2].createdAt, 'createdAt should be non-decreasing');

      // Verify completed flag defaults to false
      restored.forEach(function (t) {
        assertEqual(t.completed, false, `task "${t.text}" should start as incomplete`);
      });

      // Verify each task has an id
      restored.forEach(function (t) {
        assert(typeof t.id === 'string' && t.id.length > 0, `task "${t.text}" should have an id`);
      });
    } finally {
      teardown(fixture);
      restore();
    }
  });

  it('serialises links added via LinksMod and restores them in insertion order (Req 6.4, 8.3)', function () {
    const mock    = makeLocalStorageMock();
    const restore = withMockStorage(mock);
    const { fixture, linksEls } = buildDOMFixture();

    try {
      // Pre-populate the links key with a non-empty array so LinksMod.load()
      // skips default-link seeding and uses the stored data directly.
      // This gives us full control over the initial state.
      const existingLink = { id: 'test-seed-id', label: 'Seed Link', url: 'https://seed.example.com' };
      mock.setItem(StorageMod.LINKS_KEY, JSON.stringify([existingLink]));

      LinksMod.init(linksEls);

      // Verify seed loaded correctly
      assertEqual(LinksMod.links.length, 1, 'in-memory links should start with 1 seeded link');

      // Add two more links in order
      LinksMod.addLink('MDN Web Docs', 'https://developer.mozilla.org');
      LinksMod.addLink('Stack Overflow', 'https://stackoverflow.com');

      // Confirm in-memory count
      assertEqual(LinksMod.links.length, 3, 'in-memory links count should be 3 (1 seed + 2 added)');

      // Simulate page reload: re-read from the same mock store
      const restored = StorageMod.readLinks();
      assertEqual(restored.length, 3, 'restored links count should be 3');

      // Verify insertion order and field values
      assertEqual(restored[0].label, 'Seed Link',                  'first restored link label');
      assertEqual(restored[0].url,   'https://seed.example.com',   'first restored link url');
      assertEqual(restored[1].label, 'MDN Web Docs',               'second restored link label');
      assertEqual(restored[1].url,   'https://developer.mozilla.org', 'second restored link url');
      assertEqual(restored[2].label, 'Stack Overflow',             'third restored link label');
      assertEqual(restored[2].url,   'https://stackoverflow.com',  'third restored link url');

      // Verify each link has an id
      restored.forEach(function (l) {
        assert(typeof l.id === 'string' && l.id.length > 0, `link "${l.label}" should have an id`);
      });
    } finally {
      teardown(fixture);
      restore();
    }
  });

  it('full session round-trip: add tasks and links together, re-read both, all data intact (Req 8.2, 8.3)', function () {
    const mock    = makeLocalStorageMock();
    const restore = withMockStorage(mock);
    const { fixture, todoEls, linksEls } = buildDOMFixture();

    try {
      // Seed one existing link so LinksMod.load() skips default-seeding
      // and loads the stored data directly, giving us a clean baseline.
      const seedLink = { id: 'seed-1', label: 'Existing', url: 'https://existing.example.com' };
      mock.setItem(StorageMod.LINKS_KEY, JSON.stringify([seedLink]));

      TodoMod.init(todoEls);
      LinksMod.init(linksEls);

      // Add tasks
      TodoMod.addTask('Task Alpha');
      TodoMod.addTask('Task Beta');

      // Toggle completion on first task
      const firstId = TodoMod.tasks[0].id;
      TodoMod.toggleComplete(firstId);

      // Add a new link on top of the seeded one
      LinksMod.addLink('Google', 'https://www.google.com');

      // ── Simulate page reload ─────────────────────────────────────────────
      const restoredTasks = StorageMod.readTasks();
      const restoredLinks = StorageMod.readLinks();

      // Tasks
      assertEqual(restoredTasks.length, 2,            'should restore 2 tasks');
      assertEqual(restoredTasks[0].text, 'Task Alpha', 'first task text');
      assertEqual(restoredTasks[1].text, 'Task Beta',  'second task text');
      assertEqual(restoredTasks[0].completed, true,    'first task should be completed');
      assertEqual(restoredTasks[1].completed, false,   'second task should be incomplete');

      // Links (seed + 1 added = 2)
      assertEqual(restoredLinks.length, 2,              'should restore 2 links');
      assertEqual(restoredLinks[0].label, 'Existing',   'first link is the seeded one');
      assertEqual(restoredLinks[1].label, 'Google',     'second link was added in session');
      assertEqual(restoredLinks[1].url, 'https://www.google.com', 'added link url');
    } finally {
      teardown(fixture);
      restore();
    }
  });

  it('deep-equal round-trip: every field of every task is preserved exactly (Req 8.2)', function () {
    const mock    = makeLocalStorageMock();
    const restore = withMockStorage(mock);
    const { fixture, todoEls } = buildDOMFixture();

    try {
      TodoMod.init(todoEls);
      TodoMod.addTask('Alpha');
      TodoMod.addTask('Beta');
      TodoMod.toggleComplete(TodoMod.tasks[1].id);

      // Snapshot of in-memory tasks (deep copy via JSON)
      const snapshot = JSON.parse(JSON.stringify(TodoMod.tasks));

      // Re-read from storage (simulated reload)
      const restored = StorageMod.readTasks();

      assertDeepEqual(restored, snapshot,
        'restored tasks should be deeply equal to the snapshot taken before reload');
    } finally {
      teardown(fixture);
      restore();
    }
  });

  it('deep-equal round-trip: every field of every link is preserved exactly (Req 8.3)', function () {
    const mock    = makeLocalStorageMock();
    const restore = withMockStorage(mock);
    const { fixture, linksEls } = buildDOMFixture();

    try {
      // Pre-seed with a non-empty array to skip default-link seeding
      const seedLink = { id: 'seed-dl', label: 'Seed', url: 'https://seed.test' };
      mock.setItem(StorageMod.LINKS_KEY, JSON.stringify([seedLink]));

      LinksMod.init(linksEls);
      LinksMod.addLink('GitHub', 'https://github.com');
      LinksMod.addLink('YouTube', 'https://youtube.com');

      // Snapshot (seed + 2 added)
      const snapshot = JSON.parse(JSON.stringify(LinksMod.links));

      // Re-read from storage
      const restored = StorageMod.readLinks();

      assertDeepEqual(restored, snapshot,
        'restored links should be deeply equal to the snapshot taken before reload');
    } finally {
      teardown(fixture);
      restore();
    }
  });
});

/* ═════════════════════════════════════════════════════════════════
   TASK 10.3 — Storage error recovery integration test
   Validates: Requirements 4.5, 8.5

   Scenario:
     1. Initialise TodoMod against a normal mock store.
     2. Add an initial task (succeeds).
     3. Switch the mock store to throw QuotaExceededError on every write.
     4. Attempt to add another task.
     5. Verify:
        a. The in-memory tasks array still contains both tasks
           (the second task is kept in memory even though the write failed).
        b. An error notice element (.notice) was injected into the DOM.
        c. The error notice text mentions storage / quota / unable to save.
═════════════════════════════════════════════════════════════════ */
describe('Task 10.3 — Storage error recovery integration', function () {

  it('shows an error notice when localStorage throws QuotaExceededError (Req 8.5)', function () {
    const mock    = makeLocalStorageMock();
    const restore = withMockStorage(mock);
    const { fixture, todoEls } = buildDOMFixture();

    try {
      TodoMod.init(todoEls);

      // Add first task while storage is healthy
      TodoMod.addTask('Existing task');
      assertEqual(TodoMod.tasks.length, 1, 'should have 1 task after first add');

      // Now simulate storage quota being exceeded
      mock.setThrowOnWrite(true);

      // Remove any pre-existing notices so we can detect a new one
      document.querySelectorAll('.notice').forEach(function (n) { n.remove(); });

      // Add a second task — the write will fail
      TodoMod.addTask('New task when storage is full');

      // ── Verify error notice was shown ─────────────────────────────────────
      const notices = document.querySelectorAll('.notice');
      assert(notices.length > 0, 'an error notice (.notice) should be present in the DOM');

      const noticeText = notices[0].textContent.toLowerCase();
      assert(
        noticeText.includes('unable') ||
        noticeText.includes('storage') ||
        noticeText.includes('quota') ||
        noticeText.includes('save'),
        `notice text should mention storage failure, got: "${notices[0].textContent}"`
      );

      // ── Verify in-memory state is intact (Req 4.5) ────────────────────────
      assertEqual(TodoMod.tasks.length, 2,
        'in-memory tasks should still contain both tasks after write failure');
      assertEqual(TodoMod.tasks[0].text, 'Existing task',
        'first in-memory task should be preserved');
      assertEqual(TodoMod.tasks[1].text, 'New task when storage is full',
        'second in-memory task should be present even though write failed');
    } finally {
      teardown(fixture);
      restore();
      // Clean up any leftover notices from the test
      document.querySelectorAll('.notice').forEach(function (n) { n.remove(); });
    }
  });

  it('in-memory data remains accessible after a write failure — session continues (Req 4.5)', function () {
    const mock    = makeLocalStorageMock();
    const restore = withMockStorage(mock);
    const { fixture, todoEls } = buildDOMFixture();

    try {
      TodoMod.init(todoEls);

      // Add two tasks while healthy
      TodoMod.addTask('Task One');
      TodoMod.addTask('Task Two');

      // Trigger quota exceeded
      mock.setThrowOnWrite(true);

      // Attempt to toggle completion — the write will fail but the state must persist in memory
      const idOne = TodoMod.tasks[0].id;
      TodoMod.toggleComplete(idOne);

      // In-memory state should reflect the toggle
      assertEqual(TodoMod.tasks[0].completed, true,
        'in-memory completed flag should be toggled despite write failure');
      assertEqual(TodoMod.tasks.length, 2,
        'all tasks should remain in memory after write failure');
    } finally {
      teardown(fixture);
      restore();
      document.querySelectorAll('.notice').forEach(function (n) { n.remove(); });
    }
  });

  it('StorageMod.writeTasks returns false on QuotaExceededError (Req 8.5)', function () {
    const mock    = makeLocalStorageMock({ throwOnWrite: true });
    const restore = withMockStorage(mock);

    try {
      const result = StorageMod.writeTasks([{ id: 'x', text: 'test', completed: false, createdAt: 0 }]);
      assertEqual(result, false, 'writeTasks should return false when storage throws');
    } finally {
      restore();
      document.querySelectorAll('.notice').forEach(function (n) { n.remove(); });
    }
  });

  it('StorageMod.writeLinks returns false on QuotaExceededError (Req 8.5)', function () {
    const mock    = makeLocalStorageMock({ throwOnWrite: true });
    const restore = withMockStorage(mock);

    try {
      const result = StorageMod.writeLinks([{ id: 'y', label: 'Test', url: 'https://example.com' }]);
      assertEqual(result, false, 'writeLinks should return false when storage throws');
    } finally {
      restore();
      document.querySelectorAll('.notice').forEach(function (n) { n.remove(); });
    }
  });
});

/* ─────────────────────────────────────────────────────────────────
   Kick off result rendering after all synchronous tests have run.
───────────────────────────────────────────────────────────────────── */
renderResults();
