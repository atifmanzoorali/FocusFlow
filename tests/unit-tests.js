import './mock-chrome.js';
import { StorageManager } from '../background/storage-manager.js';
import { TabManager } from '../background/tab-manager.js';
import { APP_CONSTANTS } from '../utils/constants.js';

// ─── Tiny test runner ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStorage() {
  chrome.storage.local.data = {};
}

function resetTabs(tabs) {
  chrome.tabs.tabsList = tabs;
  chrome.tabs.listeners.onCreated = [];
  chrome.tabs.listeners.onRemoved = [];
  chrome.tabs.listeners.onActivated = [];
}

// Force TabManager re-init between test groups that need fresh state
function resetTabManager() {
  // Access private via bracket notation trick — sets #initialized = false
  // Since static private fields can't be reset externally, we reset the mock
  // state and rely on reconcileTabs() rebuilding from chrome.tabs.tabsList
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('FocusFlow Unit Tests\n');

  // ── 1. StorageManager: Default settings ─────────────────────────────────
  section('1. StorageManager — Default Settings');
  resetStorage();
  await StorageManager.init();

  const settings = await StorageManager.getSettings();
  assert(settings !== null, 'Settings exist after init');
  assert(settings.tabLimit === APP_CONSTANTS.DEFAULT_SETTINGS.tabLimit, `Default tabLimit is ${APP_CONSTANTS.DEFAULT_SETTINGS.tabLimit}`);
  assert(settings.autoParkEnabled === true, 'autoParkEnabled defaults to true');
  assert(settings.focusDuration === 25, 'focusDuration defaults to 25');

  // ── 2. StorageManager: URL sanitization (tested via addToParkingLot) ────
  section('2. StorageManager — URL Sanitization');
  resetStorage();
  await StorageManager.init();

  const dangerousUrls = [
    { url: 'javascript:alert(1)', label: 'javascript: blocked' },
    { url: 'data:text/html,<h1>XSS</h1>', label: 'data: blocked' },
    { url: 'vbscript:msgbox(1)', label: 'vbscript: blocked' },
    { url: 'not-a-url-at-all', label: 'malformed URL blocked' },
  ];

  for (const { url, label } of dangerousUrls) {
    resetStorage();
    await StorageManager.init();
    await StorageManager.addToParkingLot({ url, title: 'Test', favIconUrl: null });
    const lot = await StorageManager.getParkingLot();
    assert(lot[0].url === 'about:blank', label);
  }

  const safeUrls = [
    { url: 'https://google.com', label: 'https: passes through' },
    { url: 'http://example.com', label: 'http: passes through' },
    { url: 'chrome://newtab/', label: 'chrome: passes through' },
  ];

  for (const { url, label } of safeUrls) {
    resetStorage();
    await StorageManager.init();
    await StorageManager.addToParkingLot({ url, title: 'Test', favIconUrl: null });
    const lot = await StorageManager.getParkingLot();
    assert(lot[0].url === url, label);
  }

  // ── 3. StorageManager: Text sanitization ────────────────────────────────
  section('3. StorageManager — Text Sanitization');
  resetStorage();
  await StorageManager.init();

  await StorageManager.addToParkingLot({
    url: 'https://example.com',
    title: '<script>alert("xss")</script>',
    favIconUrl: null
  });
  const xssLot = await StorageManager.getParkingLot();
  assert(!xssLot[0].title.includes('<'), 'XSS tags stripped from title');
  assert(!xssLot[0].title.includes('>'), 'XSS closing tags stripped from title');

  // ── 4. StorageManager: Parking lot max size ──────────────────────────────
  section('4. StorageManager — Parking Lot Max Size');
  resetStorage();
  await StorageManager.init();

  for (let i = 0; i < APP_CONSTANTS.MAX_PARKING_LOT_SIZE + 5; i++) {
    await StorageManager.addToParkingLot({
      url: `https://example.com/page${i}`,
      title: `Page ${i}`,
      favIconUrl: null
    });
  }
  const fullLot = await StorageManager.getParkingLot();
  assert(
    fullLot.length <= APP_CONSTANTS.MAX_PARKING_LOT_SIZE,
    `Parking lot capped at ${APP_CONSTANTS.MAX_PARKING_LOT_SIZE} tabs (got ${fullLot.length})`
  );

  // ── 5. StorageManager: Remove from parking lot by timestamp ─────────────
  section('5. StorageManager — Remove by Timestamp');
  resetStorage();
  await StorageManager.init();

  await StorageManager.addToParkingLot({ url: 'https://a.com', title: 'A', favIconUrl: null });
  await new Promise(r => setTimeout(r, 5)); // ensure distinct timestamps
  await StorageManager.addToParkingLot({ url: 'https://b.com', title: 'B', favIconUrl: null });

  const beforeRemove = await StorageManager.getParkingLot();
  assert(beforeRemove.length === 2, 'Two tabs in parking lot before remove');

  const timestampToRemove = beforeRemove[0].timestamp;
  await StorageManager.removeFromParkingLot(timestampToRemove);

  const afterRemove = await StorageManager.getParkingLot();
  assert(afterRemove.length === 1, 'One tab remains after remove');
  assert(
    afterRemove[0].timestamp !== timestampToRemove,
    'Correct tab was removed (by timestamp)'
  );

  // ── 6. TabManager: LRU ordering ─────────────────────────────────────────
  section('6. TabManager — LRU Ordering');
  resetStorage();
  await StorageManager.init();
  resetTabs([
    { id: 201, active: false, pinned: false, url: 'https://a.com', title: 'A', favIconUrl: null },
    { id: 202, active: false, pinned: false, url: 'https://b.com', title: 'B', favIconUrl: null },
    { id: 203, active: true,  pinned: false, url: 'https://c.com', title: 'C', favIconUrl: null },
  ]);

  await TabManager.init();

  const lru = await TabManager.getLRUTab();
  assert(lru !== null, 'LRU tab found');
  assert(lru !== 203, 'Active tab is never the LRU candidate');

  // ── 7. TabManager: Pinned tabs never LRU ────────────────────────────────
  section('7. TabManager — Pinned Tabs Skipped');
  resetStorage();
  await StorageManager.init();
  resetTabs([
    { id: 301, active: false, pinned: true,  url: 'https://pinned.com', title: 'Pinned', favIconUrl: null },
    { id: 302, active: true,  pinned: false, url: 'https://active.com', title: 'Active', favIconUrl: null },
  ]);

  // Re-init to rebuild history from this new tab list
  await TabManager.reconcileTabs();

  const lruWithPinned = await TabManager.getLRUTab();
  assert(lruWithPinned === null, 'No LRU candidate when all non-active tabs are pinned');

  // ── 8. TabManager: Auto-park enforces limit (force mode) ────────────────
  section('8. TabManager — Auto-Park on Limit Exceeded');
  resetStorage();
  await StorageManager.init();
  resetTabs([
    { id: 401, active: false, pinned: false, url: 'https://oldest.com', title: 'Oldest', favIconUrl: null },
    { id: 402, active: false, pinned: false, url: 'https://middle.com', title: 'Middle', favIconUrl: null },
    { id: 403, active: true,  pinned: false, url: 'https://newest.com', title: 'Newest', favIconUrl: null },
  ]);

  await TabManager.reconcileTabs();
  await StorageManager.setSettings({ tabLimit: 2, autoParkEnabled: true, focusDuration: 25, theme: 'dark' });

  // force=true bypasses the focus mode check
  await TabManager.checkTabLimit(true);

  const tabCountAfter = await TabManager.getTabCount();
  const parkedAfter = await StorageManager.getParkingLot();

  assert(tabCountAfter <= 2, `Tab count at or below limit after sweep (got ${tabCountAfter})`);
  assert(parkedAfter.length >= 1, `At least one tab was parked (got ${parkedAfter.length})`);
  assert(
    parkedAfter.some(t => t.url === 'https://oldest.com'),
    'Oldest (LRU) tab was the one parked'
  );

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('Some tests failed.');
    process.exit(1);
  } else {
    console.log('All tests passed.');
  }
}

runTests().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
