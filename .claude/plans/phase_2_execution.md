# FocusFlow: Phase 2 - The LRU Engine (Execution Guide)

**Objective:** Implement the logic to track tab activity and maintain a persistent, sorted list of Least Recently Used (LRU) tabs.

---

## 🛠️ Task 1: TabManager Class Implementation
Create `background/tab-manager.js`.
**Requirements:**
- Export a class `TabManager`.
- Maintain an internal array `tabHistory` (array of Tab IDs).
- **Security:** Validate that every Tab ID added to the history is a positive integer.

## 🛠️ Task 2: Activity Tracking Logic
Implement listeners in `TabManager`:
1. **onActivated:** When a tab is focused, move its ID to the *end* of the `tabHistory` array (Most Recently Used position).
2. **onRemoved:** When a tab is closed, remove its ID from `tabHistory` immediately.
3. **onCreated:** Add the new Tab ID to the end of `tabHistory`.
4. **Initialization:** On startup, use `chrome.tabs.query({})` to populate the initial `tabHistory`.

## 🛠️ Task 3: Persistence Layer
**Requirements:**
- Every time `tabHistory` changes, save it to `chrome.storage.local` using `APP_CONSTANTS.STORAGE_KEYS.TAB_ORDER`.
- On extension startup/load, `TabManager` must fetch this order from storage first, then reconcile it with currently open tabs (remove IDs that no longer exist).

## 🛠️ Task 4: The LRU Selection Algorithm
Implement a static method `getLRUTab()`:
- It must return the Tab ID at the beginning of the `tabHistory` array.
- **Rules:**
  - Skip the currently `active` tab (don't close what the user is looking at).
  - Skip `pinned` tabs.
  - Return `null` if no eligible tab is found.

## 🛠️ Task 5: Integration in Background
Update `background/background.js`:
- Import `TabManager`.
- Call `TabManager.init()` in `onInstalled` and `onStartup`.

---

## 🛡️ Quality Control Check (Phase 2)
*The executing agent must verify the following:*

1. **Memory Efficiency:** Do not store full tab objects, only IDs.
2. **Robustness:** If `chrome.storage` fails, the `tabHistory` should still work in-memory as a fallback.
3. **Race Conditions:** Ensure that `onActivated` doesn't push an ID that was just closed in `onRemoved`.
4. **JSDoc:** Every method in `TabManager` must have a JSDoc block.

---

## 🚩 Definition of Done
- Opening/Switching tabs updates the `TAB_ORDER` in `chrome.storage.local` (Verify via Console).
- Closing a tab removes it from the storage list.
- `TabManager.getLRUTab()` correctly identifies the oldest, non-active, non-pinned tab.
