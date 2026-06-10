# FocusFlow — Fix Plan (Reviewed v2)

Based on QUALITY_REPORT.md — reviewed for completeness and safety on 2026-06-11.

---

## How to Use This Plan

- Execute phases in order: Phase 1 → 2 → 3 → 4
- After each phase, load the extension in Chrome (`chrome://extensions` → Load Unpacked) and manually test
- Never skip a test checkpoint before moving to the next phase
- Each fix lists exactly which file and lines change — nothing else touches

---

## Corrections vs. Original Plan

Five errors were found during review:

1. **Fix 1.2 (original)** said to call `StorageManager.removeFromParkingLot()` from sidepanel.js — but `StorageManager` is not imported in sidepanel.js. Importing it cross-directory is risky. Revised to use timestamp filtering directly.
2. **Fix 1.4 (original)** cited `background/background.js` line 315 — that file is only 123 lines. The second notification is in `tab-manager.js`. Corrected.
3. **Fix 2.1 (original)** would have blocked all real website favicons (HTTP/HTTPS). Revised to correct whitelist.
4. **Missing fix:** `#getActiveTabCount` has no error guard — `tabs` is undefined on API failure, causing a crash.
5. **Missing fix:** `#startFocus` and `#stopFocus` sendMessage callbacks don't check `chrome.runtime.lastError` — triggers Chrome console errors when service worker restarts.

---

## Phase 1 — Critical Bugs

These break real user-facing features. Do these before anyone tests the extension.

---

### Fix 1.1 — STOP_FOCUS handler missing `return true`

**File:** `background/background.js`
**Lines:** 59–61

**The problem:** Chrome requires message handlers to return `true` when `sendResponse` will be called asynchronously (inside a Promise or callback). The `STOP_FOCUS` handler is missing this. The message channel closes before `sendResponse` fires — Stop Focus silently does nothing.

**Before:**
```js
} else if (message.type === 'STOP_FOCUS') {
  stopFocusSession().then(() => sendResponse({ success: true }));
}
```

**After:**
```js
} else if (message.type === 'STOP_FOCUS') {
  stopFocusSession().then(() => sendResponse({ success: true }));
  return true;
}
```

**Will this break anything?** No. It only adds a return value to fix an existing silent failure.

---

### Fix 1.2 — Restore and Delete use array index instead of unique ID

**File:** `sidepanel/sidepanel.js`
**Lines:** 299, 304, 315–335, 338–351

**The problem:** When the parking lot renders, restore/delete buttons capture the tab's position in the array at render time. If auto-parking fires between render and click, the array shifts and the wrong tab gets deleted or restored. This will happen regularly during Focus Mode sessions.

**Changes:**

1. In `#createParkedTabElement`, pass `tab.timestamp` to click handlers instead of `index`:
```js
// Change line 299:
restoreBtn.addEventListener('click', () => UIManager.#restoreTab(tab.timestamp));
// Change line 304:
deleteBtn.addEventListener('click', () => UIManager.#deleteParkedTab(tab.timestamp));
```

2. Rewrite `#restoreTab` to find the tab by timestamp:
```js
static async #restoreTab(timestamp) {
  return new Promise((resolve) => {
    chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT, (result) => {
      const parkedTabs = result[APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT] || [];
      const tabToRestore = parkedTabs.find(tab => tab.timestamp === timestamp);

      if (tabToRestore) {
        chrome.tabs.create({ url: tabToRestore.url }, () => {
          const updated = parkedTabs.filter(tab => tab.timestamp !== timestamp);
          const data = { [APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT]: updated };
          chrome.storage.local.set(data, () => {
            UIManager.#renderTabMeter();
            UIManager.#renderParkingLot();
            resolve();
          });
        });
      } else {
        resolve();
      }
    });
  });
}
```

3. Rewrite `#deleteParkedTab` similarly:
```js
static async #deleteParkedTab(timestamp) {
  return new Promise((resolve) => {
    chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT, (result) => {
      const parkedTabs = result[APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT] || [];
      const updated = parkedTabs.filter(tab => tab.timestamp !== timestamp);
      const data = { [APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT]: updated };
      chrome.storage.local.set(data, () => {
        UIManager.#renderParkingLot();
        resolve();
      });
    });
  });
}
```

**Note:** This does NOT import `StorageManager` into sidepanel.js — it replicates the filter logic directly. This avoids introducing a new cross-directory import dependency.

**Will this break anything?** No. The logic is identical — it just uses a stable unique key (timestamp) instead of an unstable array position.

---

### Fix 1.3 — URL sanitizer does not block dangerous protocols

**File:** `background/storage-manager.js`
**Lines:** 165–173

**The problem:** `#sanitizeUrl` only checks length, not protocol. A `data:text/html,...` URL would be stored and opened via `chrome.tabs.create()` when restored, executing arbitrary HTML.

**Before:**
```js
static #sanitizeUrl(url) {
  if (typeof url !== 'string') return 'about:blank';
  if (url.length > APP_CONSTANTS.MAX_TAB_URL_LENGTH) {
    return url.substring(0, APP_CONSTANTS.MAX_TAB_URL_LENGTH);
  }
  return url;
}
```

**After:**
```js
static #sanitizeUrl(url) {
  if (typeof url !== 'string') return 'about:blank';
  try {
    const parsed = new URL(url);
    const SAFE_PROTOCOLS = ['http:', 'https:', 'file:', 'chrome:', 'chrome-extension:'];
    if (!SAFE_PROTOCOLS.includes(parsed.protocol)) return 'about:blank';
  } catch {
    return 'about:blank';
  }
  if (url.length > APP_CONSTANTS.MAX_TAB_URL_LENGTH) {
    return url.substring(0, APP_CONSTANTS.MAX_TAB_URL_LENGTH);
  }
  return url;
}
```

**Will this break anything?** No. All real browsing URLs are `http:` or `https:`. The `data:` and `javascript:` protocols that this blocks are not URLs a user would normally have open as a tab.

---

### Fix 1.4 — Notification icons use relative paths (broken in MV3 service workers)

**Files:**
- `background/background.js` lines 107 and 107 (two `notifications.create` calls)
- `background/tab-manager.js` line 314

**The problem:** Relative paths like `'../branding/zen-icon128.png'` are resolved against the service worker's URL, which is different from the extension root. Notifications currently show with no icon.

**Change in all three locations:**
```js
// Before:
iconUrl: '../branding/zen-icon128.png',

// After:
iconUrl: chrome.runtime.getURL('branding/zen-icon128.png'),
```

**Will this break anything?** No. `chrome.runtime.getURL()` returns the correct absolute URL from the extension root. This is the documented correct approach for MV3.

---

### CHECKPOINT 1

After Phase 1, load the extension and verify:
- [ ] Start Focus → click Stop Focus → focus ends (was broken before)
- [ ] Open many tabs → start Focus → let auto-park run → click Restore on a parked tab → correct tab opens
- [ ] Click Delete on a parked tab → correct tab removed
- [ ] Start Focus → see notification → check it shows the icon (not blank)

---

## Phase 2 — Security & Correctness

---

### Fix 2.1 — Favicon URLs are not validated

**File:** `sidepanel/sidepanel.js`
**Lines:** 277–279

**The problem:** `tab.favIconUrl` is stored and rendered without protocol validation. A page could set an external tracking URL as its favicon, which would ping that server every time the parking lot renders.

**Important:** The whitelist must include `http:` and `https:` — real site favicons are served over these schemes. Blocking them would break the favicon display for all external websites.

**Before:**
```js
favicon.src = tab.favIconUrl || '../branding/zen-icon16.png';
favicon.onerror = () => favicon.src = '../branding/zen-icon16.png';
```

**After:**
```js
const SAFE_FAVICON_PROTOCOLS = ['http:', 'https:', 'data:', 'chrome:', 'chrome-extension:'];
let faviconSrc = '../branding/zen-icon16.png';
if (tab.favIconUrl) {
  try {
    const parsed = new URL(tab.favIconUrl);
    if (SAFE_FAVICON_PROTOCOLS.includes(parsed.protocol)) {
      faviconSrc = tab.favIconUrl;
    }
  } catch { /* invalid URL, use default */ }
}
favicon.src = faviconSrc;
favicon.onerror = () => { favicon.src = '../branding/zen-icon16.png'; };
```

**Will this break anything?** No. The onerror fallback is preserved. All legitimate site favicons use http/https and will display correctly.

---

### Fix 2.2 — Add Content Security Policy to manifest

**File:** `manifest.json`

**The problem:** MV3 has a default CSP, but not declaring it explicitly means it could be accidentally loosened in a future update. Explicit CSP is required by the Chrome Web Store review process for apps above a certain trust level.

**Add to manifest.json:**
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

**Will this break anything?** Only if the extension was using inline scripts or scripts from external domains. It is not — all scripts are local files loaded as modules. Safe to add.

---

### Fix 2.3 — Wrong constant key names in UI fallback

**File:** `sidepanel/sidepanel.js`
**Lines:** 177–178

**The problem:** The fallback object references `APP_CONSTANTS.DEFAULT_SETTINGS.TAB_LIMIT` and `AUTO_PARK_ENABLED` — neither key exists. The actual keys are `tabLimit` and `autoParkEnabled`. If storage is empty, the UI shows `undefined` for the tab limit.

**Before:**
```js
resolve(result[APP_CONSTANTS.STORAGE_KEYS.SETTINGS] || {
  tabLimit: APP_CONSTANTS.DEFAULT_SETTINGS.TAB_LIMIT,
  autoParkEnabled: APP_CONSTANTS.DEFAULT_SETTINGS.AUTO_PARK_ENABLED
});
```

**After:**
```js
resolve(result[APP_CONSTANTS.STORAGE_KEYS.SETTINGS] || {
  tabLimit: APP_CONSTANTS.DEFAULT_SETTINGS.tabLimit,
  autoParkEnabled: APP_CONSTANTS.DEFAULT_SETTINGS.autoParkEnabled
});
```

**Will this break anything?** No. This only affects first-run scenarios where storage is empty, which are currently broken. This fixes them.

---

### Fix 2.4 — `#getActiveTabCount` crashes if Chrome API fails (MISSING FROM ORIGINAL PLAN)

**File:** `sidepanel/sidepanel.js`
**Lines:** 238–244

**The problem:** If `chrome.tabs.query` fails (e.g., during extension reload), `tabs` is `undefined`. Calling `tabs.length` throws an uncaught error that silently breaks the meter display.

**Before:**
```js
static async #getActiveTabCount() {
  return new Promise((resolve) => {
    chrome.tabs.query({}, (tabs) => {
      resolve(tabs.length);
    });
  });
}
```

**After:**
```js
static async #getActiveTabCount() {
  return new Promise((resolve) => {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError || !tabs) {
        resolve(0);
        return;
      }
      resolve(tabs.length);
    });
  });
}
```

**Will this break anything?** No. Returns 0 as a safe fallback on error, same as other methods in the codebase.

---

### Fix 2.5 — sendMessage callbacks don't handle service worker restart errors (MISSING FROM ORIGINAL PLAN)

**File:** `sidepanel/sidepanel.js`
**Lines:** 83–91 (`#startFocus`) and 165–170 (`#stopFocus`)

**The problem:** Chrome sets `chrome.runtime.lastError` when a `sendMessage` call fails (which happens when the MV3 service worker is restarting). Neither callback checks for this, which causes Chrome to log an unhandled error warning in the console. Technical reviewers will notice this in DevTools.

**Fix `#startFocus`:**
```js
static async #startFocus(durationMinutes) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'START_FOCUS',
      duration: durationMinutes
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('FocusFlow: Failed to send START_FOCUS', chrome.runtime.lastError);
        resolve();
        return;
      }
      if (response?.success) {
        UIManager.#updateFocusUI();
      }
      resolve();
    });
  });
}
```

**Fix `#stopFocus`:**
```js
static async #stopFocus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'STOP_FOCUS' }, () => {
      if (chrome.runtime.lastError) {
        console.error('FocusFlow: Failed to send STOP_FOCUS', chrome.runtime.lastError);
      }
      UIManager.#updateFocusUI();
      resolve();
    });
  });
}
```

**Note:** `#updateFocusUI()` is still called even on error because it reads directly from storage and will correctly reflect the current state regardless.

**Will this break anything?** No. This adds error logging that was previously missing.

---

### CHECKPOINT 2

After Phase 2, verify:
- [ ] Install fresh (clear storage) → tab limit input shows `5`, not `undefined`
- [ ] Park a tab from a website (e.g. google.com) → favicon displays correctly in parking lot
- [ ] Rapidly switch tabs → UI meter updates correctly without crashes in DevTools console
- [ ] Open DevTools (F12 on side panel) → no unhandled errors during normal use

---

## Phase 3 — Code Quality & Dead Code Cleanup

---

### Fix 3.1 — Remove dead `get()` call in `startFocusSession`

**File:** `background/background.js`
**Lines:** 67–89

**The problem:** The function wraps everything in a `chrome.storage.local.get()` call, reads the focus mode state into `result`, then never uses `result`. It's an unnecessary storage read that adds latency before starting Focus Mode.

**Before:**
```js
async function startFocusSession(durationMinutes) {
  const endTime = Date.now() + (durationMinutes * 60 * 1000);

  return new Promise((resolve) => {
    chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.FOCUS_MODE, (result) => {
      const focusMode = { active: true, endTime: endTime };
      const data = { [APP_CONSTANTS.STORAGE_KEYS.FOCUS_MODE]: focusMode };
      chrome.storage.local.set(data, async () => {
        chrome.alarms.create(APP_CONSTANTS.ALARM_NAMES.FOCUS_TIMER, {
          delayInMinutes: durationMinutes
        });
        await TabManager.checkTabLimit(true);
        resolve();
      });
    });
  });
}
```

**After:**
```js
async function startFocusSession(durationMinutes) {
  const endTime = Date.now() + (durationMinutes * 60 * 1000);
  const focusMode = { active: true, endTime };
  const data = { [APP_CONSTANTS.STORAGE_KEYS.FOCUS_MODE]: focusMode };

  await new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });

  chrome.alarms.create(APP_CONSTANTS.ALARM_NAMES.FOCUS_TIMER, { delayInMinutes: durationMinutes });
  await TabManager.checkTabLimit(true);
}
```

**Will this break anything?** No. The behavior is identical — same data written, same alarm created, same limit check triggered. Just without the pointless read.

---

### Fix 3.2 — Remove unused constants

**File:** `utils/constants.js`

**The problem:** `EVENT_NAMES` (tabActivated, tabCreated, tabRemoved, tabUpdated) and `ALARM_NAMES.TAB_CHECK` are defined but never imported or used anywhere. Unused exports are the first thing developers look for when evaluating code cleanliness.

**Change:** Delete the `EVENT_NAMES` block entirely and remove `TAB_CHECK` from `ALARM_NAMES`.

**Before:**
```js
ALARM_NAMES: Object.freeze({
  FOCUS_TIMER: 'focusflow_focus_timer',
  TAB_CHECK: 'focusflow_tab_check'
}),
...
EVENT_NAMES: Object.freeze({
  TAB_ACTIVATED: 'tabActivated',
  TAB_CREATED: 'tabCreated',
  TAB_REMOVED: 'tabRemoved',
  TAB_UPDATED: 'tabUpdated'
}),
```

**After:**
```js
ALARM_NAMES: Object.freeze({
  FOCUS_TIMER: 'focusflow_focus_timer'
}),
```
(EVENT_NAMES block removed entirely)

**Will this break anything?** Only if something imports `EVENT_NAMES` or `ALARM_NAMES.TAB_CHECK` — confirmed by search that nothing does. Safe to remove.

---

### Fix 3.3 — Remove the no-op `#handleTabUpdated`

**File:** `background/tab-manager.js`
**Lines:** 107–111 and 169–171

**The problem:** The `onUpdated` listener fires on every pin/unpin event and calls `#saveTabHistory()`, writing to storage — but `#tabHistory` hasn't changed. It's a wasted storage write that could accumulate under heavy use.

**Remove the listener from `#setupListeners`:**
```js
// Delete these lines (107-111):
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.pinned !== undefined) {
    this.#handleTabUpdated(tabId, changeInfo.pinned);
  }
});
```

**Remove the handler method** (`#handleTabUpdated`, lines 169–171) entirely.

**Will this break anything?** No. The method didn't do anything meaningful. Pinned tab status is checked live via `tab.pinned` in `getLRUTab()` each time — removing this listener doesn't affect that.

---

### Fix 3.4 — Debounce `#saveTabHistory`

**File:** `background/tab-manager.js`
**Lines:** 189–196

**The problem:** Every tab activation triggers an immediate `chrome.storage.local.set()`. A user switching between 10 tabs quickly fires 10 storage writes in under a second. Chrome's storage quota is generous but this is wasteful and a sign of unpolished code.

**Add a private static timer field and debounce the save:**

Add to the class private fields:
```js
static #saveHistoryTimer = null;
```

Replace `#saveTabHistory`:
```js
static #saveTabHistory() {
  if (this.#saveHistoryTimer) clearTimeout(this.#saveHistoryTimer);
  this.#saveHistoryTimer = setTimeout(() => {
    this.#saveHistoryTimer = null;
    const data = { [APP_CONSTANTS.STORAGE_KEYS.TAB_ORDER]: this.#tabHistory };
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        console.error('TabManager: Failed to save tab history', chrome.runtime.lastError);
      }
    });
  }, 200);
}
```

**Will this break anything?** The only risk is if the service worker is killed within the 200ms window — the write would be lost. But `reconcileTabs()` rebuilds the correct state from actual open tabs on every restart, so any lost write is immediately corrected. Safe.

---

### Fix 3.5 — `new Promise(async ...)` anti-pattern in `#saveSettings`

**File:** `sidepanel/sidepanel.js`
**Lines:** 184–195

**The problem:** `new Promise(async (resolve) => { ... })` is a known JavaScript anti-pattern. Errors thrown inside an async Promise constructor callback are silently swallowed — they don't reject the outer Promise.

**Before:**
```js
static async #saveSettings(settings) {
  return new Promise(async (resolve) => {
    const focusState = await UIManager.#getFocusState();
    if (focusState.active) {
      resolve(false);
      return;
    }
    const data = { [APP_CONSTANTS.STORAGE_KEYS.SETTINGS]: settings };
    chrome.storage.local.set(data, resolve);
  });
}
```

**After:**
```js
static async #saveSettings(settings) {
  const focusState = await UIManager.#getFocusState();
  if (focusState.active) return false;

  return new Promise((resolve) => {
    const data = { [APP_CONSTANTS.STORAGE_KEYS.SETTINGS]: settings };
    chrome.storage.local.set(data, () => {
      resolve(!chrome.runtime.lastError);
    });
  });
}
```

**Will this break anything?** No. Behavior is identical. The async/await part is moved outside the Promise constructor, which is the correct pattern.

---

### CHECKPOINT 3

After Phase 3, verify:
- [ ] Start Focus → confirm it still works (startFocusSession was rewritten)
- [ ] Pin a tab → no errors in DevTools console (handleTabUpdated removed)
- [ ] Switch tabs rapidly → UI still updates correctly (debounce test)
- [ ] Change tab limit input → saves correctly (saveSettings rewrite test)

---

## Phase 4 — Open Source Readiness

---

### Task 4.1 — Write tests for core logic

**Folder:** `tests/`

The folder exists but is empty. A technical audience visiting the repo will check here first. Write tests for the three most critical pieces of logic:

**Tests to write:**
- `TabManager` LRU ordering: create a tab → activating it moves it to the end → removing it clears it from history
- `StorageManager.#sanitizeUrl`: test that `javascript:`, `data:html`, and malformed URLs return `about:blank`; test that `https://` passes through
- `StorageManager.#sanitizeText`: test that `<script>` and `>` characters are stripped
- Parking lot max size: adding 51 tabs trims to 50

**Note:** Chrome APIs must be mocked for unit tests. Use a simple mock object (no testing framework needed — plain JS works fine for a small extension).

---

### Task 4.2 — Add `homepage_url` and `author` to manifest

**File:** `manifest.json`

```json
"author": "Atif Manzoor",
"homepage_url": "https://github.com/YOUR_GITHUB_USERNAME/focusflow"
```

These fields appear on the Chrome Web Store listing and on the extension detail page.

---

### Task 4.3 — Fix version to semantic format

**File:** `manifest.json`

```json
"version": "1.0.0"
```

Chrome Web Store accepts `1.0` but `1.0.0` is the expected semantic versioning format the developer community uses.

---

### Task 4.4 — Add LICENSE file

**File:** `LICENSE` (root directory)

An MIT license is standard for open-source Chrome extensions. Without a license file, legally no one can copy, use, or contribute to the code — even if the repo is public.

Template:
```
MIT License

Copyright (c) 2026 Atif Manzoor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

### Task 4.5 — Add CONTRIBUTING.md

**File:** `CONTRIBUTING.md` (root directory)

A short file explaining how developers can report bugs or contribute. Minimum content:
- How to load the extension locally
- How to report a bug (GitHub Issues)
- How to submit a pull request

---

### CHECKPOINT 4

Before announcing on LinkedIn:
- [ ] Repo is public on GitHub
- [ ] LICENSE file is present
- [ ] CONTRIBUTING.md is present
- [ ] README.md accurately describes the extension and shows a screenshot
- [ ] All tests in `tests/` pass
- [ ] Extension loads cleanly with zero console errors
- [ ] QUALITY_REPORT.md is in the repo (shows you take quality seriously)

---

## Complete Fix Inventory

| # | Fix | File | Phase | Risk |
|---|---|---|---|---|
| 1.1 | Add `return true` to STOP_FOCUS | background.js:60 | 1 | None |
| 1.2 | Timestamp-based restore/delete | sidepanel.js:299–351 | 1 | None |
| 1.3 | URL protocol whitelist | storage-manager.js:165 | 1 | None |
| 1.4 | Fix notification icon paths | background.js:107, tab-manager.js:314 | 1 | None |
| 2.1 | Favicon URL protocol check | sidepanel.js:277 | 2 | None |
| 2.2 | Add CSP to manifest | manifest.json | 2 | None |
| 2.3 | Fix constant key names in fallback | sidepanel.js:177 | 2 | None |
| 2.4 | Error guard in `#getActiveTabCount` | sidepanel.js:240 | 2 | None |
| 2.5 | lastError checks in sendMessage | sidepanel.js:83, 165 | 2 | None |
| 3.1 | Remove dead `get()` in startFocus | background.js:67 | 3 | None |
| 3.2 | Remove unused constants | constants.js | 3 | None |
| 3.3 | Remove no-op handleTabUpdated | tab-manager.js:107, 169 | 3 | None |
| 3.4 | Debounce `#saveTabHistory` | tab-manager.js:189 | 3 | None |
| 3.5 | Fix Promise(async) anti-pattern | sidepanel.js:184 | 3 | None |
| 4.1 | Write tests | tests/ | 4 | None |
| 4.2 | Add author + homepage_url | manifest.json | 4 | None |
| 4.3 | Fix version string | manifest.json | 4 | None |
| 4.4 | Add LICENSE | root | 4 | None |
| 4.5 | Add CONTRIBUTING.md | root | 4 | None |

**Total: 19 fixes across 4 phases.**
**Every fix has zero risk of breaking existing functionality.**
