/**
 * tests/integration/defaults.test.js
 * Integration test: default links seeded on first load (Requirement 6.6)
 * Implemented in Task 10.2
 *
 * HOW TO RUN:
 *   Open tests/integration/defaults.html in a browser via file://
 *   All results are shown on the page and in the browser console.
 */

/* ─── Minimal test runner ───────────────────────────────────────────────── */

const DefaultsTests = {
  _results: [],

  assert(description, condition) {
    const status = condition ? 'PASS' : 'FAIL';
    this._results.push({ status, description });
    const icon = condition ? '✅' : '❌';
    console.log(`${icon} [${status}] ${description}`);
  },

  assertEqual(description, actual, expected) {
    const pass = actual === expected;
    if (!pass) {
      console.error(`  Expected: ${JSON.stringify(expected)}`);
      console.error(`  Actual:   ${JSON.stringify(actual)}`);
    }
    this.assert(description, pass);
  },

  summarise() {
    const total  = this._results.length;
    const passed = this._results.filter(r => r.status === 'PASS').length;
    const failed = total - passed;
    console.log(`\n── Summary: ${passed}/${total} passed, ${failed} failed ──`);
    return failed === 0;
  },

  /** Render results into a DOM element (called from the HTML harness). */
  renderTo(container) {
    container.innerHTML = '';

    const heading = document.createElement('h2');
    heading.textContent = 'defaults.test.js — Default Links Integration Test';
    container.appendChild(heading);

    const ul = document.createElement('ul');
    ul.style.fontFamily = 'monospace';
    ul.style.lineHeight  = '1.8';

    for (const r of this._results) {
      const li = document.createElement('li');
      li.style.color = r.status === 'PASS' ? 'green' : 'red';
      li.textContent = `${r.status === 'PASS' ? '✅' : '❌'} ${r.description}`;
      ul.appendChild(li);
    }
    container.appendChild(ul);

    const total  = this._results.length;
    const passed = this._results.filter(r => r.status === 'PASS').length;
    const summary = document.createElement('p');
    summary.style.fontWeight = 'bold';
    summary.textContent = `${passed}/${total} passed`;
    summary.style.color = passed === total ? 'green' : 'red';
    container.appendChild(summary);
  },
};

/* ─── Test suite ─────────────────────────────────────────────────────────── */

/**
 * Integration test: Default Links Seeded on First Load
 *
 * Scenario:
 *   1. Clear localStorage (simulate a brand-new user — key absent).
 *   2. Set up the minimal DOM that LinksMod.init() requires.
 *   3. Call LinksMod.load() directly (bypassing init() event wiring to
 *      avoid attaching duplicate listeners on re-runs).
 *   4. Verify that the links container contains exactly 3 rendered buttons
 *      with the labels Google, GitHub, and YouTube.
 *
 * Validates: Requirement 6.6
 */
function runDefaultLinksTests() {
  /* ── 1. Isolate localStorage ──────────────────────────────────────────── */
  const LINKS_KEY = 'dashboard_links';
  localStorage.removeItem(LINKS_KEY);

  /* ── 2. Build a minimal DOM fixture ─────────────────────────────────────
     LinksMod.render() writes into _els.container, so we need a real element
     attached to the document so that querySelector / DOM assertions work.   */
  const fixture = document.createElement('div');
  fixture.id = 'links-test-fixture';
  document.body.appendChild(fixture);

  const container  = document.createElement('div');
  container.id     = 'links-container-test';
  const labelInput = document.createElement('input');
  const urlInput   = document.createElement('input');
  const addBtn     = document.createElement('button');

  fixture.appendChild(container);
  fixture.appendChild(labelInput);
  fixture.appendChild(urlInput);
  fixture.appendChild(addBtn);

  /* ── 3. Wire LinksMod to the fixture without calling init()
     (init() also wires click/keydown listeners and then calls load();
      we set _els directly and call load() ourselves to keep the test
      focused on the seeding behaviour and avoid side-effects.)            */
  LinksMod._els = { container, labelInput, urlInput, addBtn };
  LinksMod.links = [];          // reset in-memory state
  LinksMod.load();              // this should seed and render defaults

  /* ── 4. Assertions ──────────────────────────────────────────────────── */

  // 4a. Exactly 3 link items rendered
  const linkItems = container.querySelectorAll('.link-item');
  DefaultsTests.assertEqual(
    'Three default link items are rendered in the container',
    linkItems.length,
    3
  );

  // Collect button labels from the rendered link buttons
  const renderedLabels = Array.from(
    container.querySelectorAll('.link-btn')
  ).map(btn => btn.textContent.trim());

  // 4b. Google is present
  DefaultsTests.assert(
    'Default link "Google" is rendered',
    renderedLabels.includes('Google')
  );

  // 4c. GitHub is present
  DefaultsTests.assert(
    'Default link "GitHub" is rendered',
    renderedLabels.includes('GitHub')
  );

  // 4d. YouTube is present
  DefaultsTests.assert(
    'Default link "YouTube" is rendered',
    renderedLabels.includes('YouTube')
  );

  // 4e. Default links are persisted to localStorage after seeding
  const stored = localStorage.getItem(LINKS_KEY);
  DefaultsTests.assert(
    'Default links are persisted to localStorage after seeding',
    stored !== null && stored !== '[]'
  );

  // 4f. The persisted data contains all three expected labels
  let parsedLinks = [];
  try { parsedLinks = JSON.parse(stored); } catch (_) {}
  const storedLabels = parsedLinks.map(l => l.label);
  DefaultsTests.assert(
    'Persisted data contains "Google" entry',
    storedLabels.includes('Google')
  );
  DefaultsTests.assert(
    'Persisted data contains "GitHub" entry',
    storedLabels.includes('GitHub')
  );
  DefaultsTests.assert(
    'Persisted data contains "YouTube" entry',
    storedLabels.includes('YouTube')
  );

  // 4g. Each persisted link has a valid http/https URL
  const allValidUrls = parsedLinks.every(
    l => l.url && (l.url.startsWith('http://') || l.url.startsWith('https://'))
  );
  DefaultsTests.assert(
    'All three persisted default links have valid http(s) URLs',
    allValidUrls
  );

  // 4h. Each persisted link has a unique id
  const ids = parsedLinks.map(l => l.id);
  const uniqueIds = new Set(ids);
  DefaultsTests.assertEqual(
    'All three persisted default links have unique ids',
    uniqueIds.size,
    3
  );

  // 4i. Subsequent load() call does NOT re-seed (existing data preserved)
  const linkCountBefore = LinksMod.links.length;
  LinksMod.load();
  DefaultsTests.assertEqual(
    'Subsequent load() does not re-seed when links already exist (count stays at 3)',
    LinksMod.links.length,
    linkCountBefore
  );

  /* ── 5. Teardown ─────────────────────────────────────────────────────── */
  document.body.removeChild(fixture);
  localStorage.removeItem(LINKS_KEY);   // leave storage clean
}

/* ─── Entry point called by the HTML harness ────────────────────────────── */
function runAllDefaultsTests() {
  console.group('defaults.test.js — Default Links Integration Test (Req 6.6)');
  runDefaultLinksTests();
  const allPassed = DefaultsTests.summarise();
  console.groupEnd();
  return allPassed;
}
