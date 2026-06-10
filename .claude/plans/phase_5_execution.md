# FocusFlow: Phase 5 - Focus Mode & Final Audit (Execution Guide)

**Objective:** Implement the lockable Focus Timer and perform a final quality and security audit to make the extension production-ready.

---

## 🛠️ Task 1: Focus Mode Engine
Update `background/background.js`.
**Requirements:**
- Implement a listener for `chrome.alarms.onAlarm`.
- When the `FOCUS_TIMER` alarm triggers:
  1. Update `STORAGE_KEYS.FOCUS_MODE` to `{ active: false, endTime: null }`.
  2. Use `chrome.notifications.create` to alert the user that their focus session has ended.
- Implement a message listener `onMessage` to handle `"START_FOCUS"` and `"STOP_FOCUS"` from the Side Panel.

## 🛠️ Task 2: UI Hardcore Constraint
Update `sidepanel/sidepanel.js`.
**Requirements:**
- Add a "Focus Mode" section in `sidepanel.html` with a "Start Focus" button and a duration picker (default 25m).
- When Focus Mode is active (check `FOCUS_MODE` in storage):
  1. Disable the `#limit-input` field.
  2. Disable the "Start Focus" button.
  3. Show a countdown timer (calculated from `endTime`).
- **Reactive State:** The UI must automatically enable/disable these fields based on the `FOCUS_MODE` state in storage.

## 🛠️ Task 3: Visual Polish & Notifications
**Requirements:**
- Add a `notifications` permission to `manifest.json`.
- Add a "Focus Active" badge or subtle glow to the Side Panel header when the timer is running.
- Ensure the "Start Focus" button has a satisfying hover/click animation.

## 🛠️ Task 4: The Final Production Audit
**Code Cleanup:**
- Search and remove all `console.log` and `console.debug` statements.
- Ensure all public-facing classes and methods have complete JSDoc headers.
- Verify that `APP_CONSTANTS` is used for ALL storage keys and event names.

**Security Check:**
- Ensure no `eval()` or `new Function()` is used.
- Verify that `permissions` in `manifest.json` are only: `["tabs", "storage", "sidePanel", "alarms", "notifications"]`.

---

## 🛡️ Quality Control Check (Phase 5)
*The executing agent must verify the following:*

1. **Timer Persistence:** If the browser is restarted during a focus session, the timer should still show the correct remaining time based on `endTime`.
2. **Settings Lock:** Verify that it is impossible to change the tab limit while in Focus Mode (both via UI and by preventing the background sweep if a rogue message is sent).
3. **Notification Stability:** Verify the notification appears even if the side panel is closed.

---

## 🚩 Definition of Done
- Start a 1-minute Focus Session. Verify the tab limit input is disabled.
- Wait for the session to end. Verify a system notification appears and the input is re-enabled.
- The codebase is clean, documented, and follows all "Zero-Slop" rules.
