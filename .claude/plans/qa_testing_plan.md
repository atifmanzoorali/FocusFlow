# FocusFlow: QA & Functional Testing Plan

**Objective:** To verify that all core features of the FocusFlow Tab Limiter are working as intended and that the state remains synchronized across all components.

---

## 🧪 1. Unit Testing: Logic Managers
### TabManager (LRU Engine)
- [ ] **Test 1.1:** Add 3 tabs. Verify history is `[ID1, ID2, ID3]`.
- [ ] **Test 1.2:** Activate ID1. Verify history updates to `[ID2, ID3, ID1]`.
- [ ] **Test 1.3:** Remove ID2. Verify history is `[ID3, ID1]`.
- [ ] **Test 1.4:** `getLRUTab()` with ID1 active. Verify it returns ID3.

### StorageManager (Persistence)
- [ ] **Test 2.1:** Set tab limit to 10. Verify value is persisted after browser restart.
- [ ] **Test 2.2:** Add tab to Parking Lot. Verify metadata matches original tab perfectly.
- [ ] **Test 2.3:** Exceed `MAX_PARKING_LOT_SIZE`. Verify oldest parked item is purged.

---

## 🔗 2. Integration Testing: Pipeline Flows
### The Auto-Park Cycle
- [ ] **Flow 3.1:** Open tab while at limit. 
  - Result: LRU Tab closed -> Metadata appears in Side Panel -> Notification sent (if enabled).
### The Reactive Limit
- [ ] **Flow 3.2:** Decrease limit in Side Panel (e.g., 5 -> 3).
  - Result: 2 Tabs immediately park -> UI updates "Tab Meter" fill and count.
### The Focus Timer
- [ ] **Flow 3.3:** Start Focus Session.
  - Result: Timer starts in UI -> Limit input disabled -> `onAlarm` triggers after duration -> Notification sent.

---

## 📱 3. UI/UX Verification
- [ ] **Sync:** Open/Close tabs in the browser. Verify Side Panel count updates within 200ms.
- [ ] **Restore:** Click "Restore" on a parked tab. Verify it opens and is removed from the Parking Lot list.
- [ ] **Delete:** Click "Delete" on a parked tab. Verify it is removed from storage without opening.

---

## 🚩 QA Pass Criteria
1. All functional tests above pass without console errors.
2. No data loss (Tab URLs/Titles) during parking/restoration.
3. UI remains responsive during high-frequency tab operations.
