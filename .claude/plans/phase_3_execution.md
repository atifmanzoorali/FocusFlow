# FocusFlow: Phase 3 - The Limiter & Parking Lot (Execution Guide)

**Objective:** Implement the core "Tab Limiting" logic that automatically parks the Least Recently Used tab when the limit is exceeded.

---

## 🛠️ Task 1: StorageManager Extension
Update `background/storage-manager.js`.
**Requirements:**
- Implement `addToParkingLot(tabData)`: 
  - Prepends a tab metadata object `{url, title, favIconUrl, timestamp}` to the `PARKING_LOT` array.
  - Enforce `MAX_PARKING_LOT_SIZE` (from constants) to prevent storage bloating.
- Implement `removeFromParkingLot(timestamp)`: To allow restoring/deleting later.

## 🛠️ Task 2: The Parking Logic
Implement `TabManager.autoParkLRUTab()` in `background/tab-manager.js`.
**Requirements:**
- Call `getLRUTab()` to find the candidate.
- If a candidate exists:
  1. Fetch its metadata using `chrome.tabs.get`.
  2. Call `StorageManager.addToParkingLot`.
  3. Close the tab using `chrome.tabs.remove`.
- **Security:** Ensure you are not parking `chrome://` or `edge://` internal pages if they cause errors, though metadata fetching should be handled gracefully.

## 🛠️ Task 3: The Limiter Trigger
Update `background/background.js`.
**Requirements:**
- Create a function `checkTabLimit()`.
- Logic: 
  - Get the `tabLimit` from `StorageManager.getSettings()`.
  - Get the current `tabCount` from `TabManager.getTabCount()`.
  - If `tabCount > tabLimit`, call `TabManager.autoParkLRUTab()`.
- **Listeners:** Call `checkTabLimit()` inside the `chrome.tabs.onCreated` listener.

## 🛠️ Task 4: Setting Listener (Reactive Limiting)
**Requirements:**
- In `background.js`, add a `chrome.storage.onChanged` listener.
- If the `tabLimit` in settings is decreased, immediately trigger `checkTabLimit()` to clean up excess tabs.

---

## 🛡️ Quality Control Check (Phase 3)
*The executing agent must verify the following:*

1. **Atomic Operations:** Ensure the tab is only closed *after* the metadata is successfully saved to the Parking Lot storage.
2. **Infinite Loops:** Ensure the `onCreated` -> `park` -> `close` cycle doesn't trigger unexpected behavior.
3. **Data Integrity:** Metadata must include `timestamp` for unique identification in the Parking Lot.
4. **Sanitization:** Ensure Tab Titles are stored as plain text.

---

## 🚩 Definition of Done
- Set limit to 5. Open 6 tabs. Verify the 6th tab triggers the closure of the oldest (LRU) tab.
- Check `chrome.storage.local` to verify the closed tab's metadata is in the `PARKING_LOT`.
- Reduce limit from 5 to 3. Verify 2 tabs are automatically parked.
