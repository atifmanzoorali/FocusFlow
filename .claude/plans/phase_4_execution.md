# FocusFlow: Phase 4 - Side Panel UI (Execution Guide)

**Objective:** Build a premium, reactive, and highly aesthetic side panel using Glassmorphism design principles.

---

## 🛠️ Task 1: UI Logic & State Management
Create `sidepanel/sidepanel.js`.
**Requirements:**
- **Initialization:** On load, fetch `SETTINGS`, `TAB_ORDER`, and `PARKING_LOT` from storage.
- **Single Source of Truth:** Implement a `render()` function that reads from storage and updates the entire UI.
- **Reactive Sync:** Listen to `chrome.storage.onChanged`. If any key changes, re-trigger `render()`.
- **Tab Counting:** Use `chrome.tabs.query` to get the actual live count, but use the `tabLimit` from storage.

## 🛠️ Task 2: The Tab Meter (Visual Gauge)
**Requirements:**
- Calculate percentage: `(currentTabs / limit) * 100`.
- **Dynamic Styling:** 
  - < 70%: Green (Focus Mode)
  - 70-89%: Yellow (Warning)
  - >= 90%: Red (Critical)
- Update `#meter-fill` width and `#tab-count` text.

## 🛠️ Task 3: The Parking Lot Feed
**Requirements:**
- Use `DocumentFragment` to build the list of parked tabs for better performance.
- **Security:** Use `textContent` for titles. Use `createElement` and `appendChild`.
- **Actions:**
  1. **Restore:** Call `chrome.tabs.create({ url })` and then remove the item from storage.
  2. **Delete:** Remove the item from storage.
- **Relative Time:** Implement a helper function using `Intl.RelativeTimeFormat` to show "Parked 2m ago".

## 🛠️ Task 4: Premium Glassmorphism CSS
Update `sidepanel/sidepanel.css`.
**Design Tokens:**
- Background: `#0f172a` (Slate 900).
- Card Background: `rgba(30, 41, 59, 0.7)`.
- Border: `1px solid rgba(255, 255, 255, 0.1)`.
- Backdrop Blur: `12px`.
- Animations: `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`.

---

## 🛡️ Quality Control Check (Phase 4)
*The executing agent must verify the following:*

1. **No XSS:** Verify that no parked tab titles can execute scripts (use `textContent`).
2. **Layout Stability:** UI should not "jump" when a new tab is added to the list.
3. **Responsive:** Side panel width is variable; ensure the meter and list scale correctly.
4. **Performance:** Do not re-render the entire list if only the tab count changed (Optional but preferred).

---

## 🚩 Definition of Done
- Opening/Closing a tab in the browser immediately updates the "Tab Meter" in the side panel.
- The "Parking Lot" list displays all recently closed tabs with their favicons and titles.
- Clicking "Restore" opens the tab in a new window and removes it from the list.
- The UI looks premium, blurred, and professional.
