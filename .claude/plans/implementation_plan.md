# FocusFlow: Technical Implementation Plan

**Role:** Technical Founder / Architect
**Project:** FocusFlow Tab Limiter (Chrome Extension)
**Version:** 1.0 (Production-Grade)

---

## 🛡️ Anti-Slop & Security Guardrails
*To be strictly followed by the executing agent.*

1. **Modular Architecture:** Do not write "God Objects." Logic must be separated into `StorageManager`, `TabManager`, and `UIManager`.
2. **No Magic Strings:** All event names, storage keys, and default values must be defined in a `CONSTANTS` object in `utils/constants.js`.
3. **Fail-Safe Logic:** Every `chrome.*` API call must be wrapped in error handling. Use `chrome.runtime.lastError` checks.
4. **Security First:** 
   - No use of `innerHTML` for user-generated content (e.g., Tab Titles). Use `textContent` or `createElement`.
   - Sanitize all URLs before storage/rendering.
   - Minimalist permissions: Do not request permissions not explicitly used.
5. **State Synchronization:** Use a "Single Source of Truth." The `chrome.storage.local` is the DB; the UI must react to storage changes via `chrome.storage.onChanged`.
6. **Code Quality:** Use JSDoc for function headers. Variable names must be descriptive (e.g., `leastRecentlyUsedTabId`, not `lru`).

---

## 📡 Inter-Component Communication
- **Background to UI:** The background script must never push data directly to the UI. Instead, it updates `chrome.storage`, and the Side Panel listens for changes.
- **UI to Background:** Use `chrome.runtime.sendMessage` only for action-based triggers (e.g., "Force Park Tab Now").

---

## 🎨 Premium UI Standards (Glassmorphism)
- **Colors:** Use a base of `#0f172a` (Slate 900) for dark mode.
- **Backdrop:** Use `backdrop-filter: blur(12px)` for the Side Panel sections.
- **Typography:** Sans-serif (Inter/system-ui) with varying font weights (400, 600).
- **Transitions:** All state changes (meter fill, list entry) must have a `transition: all 0.3s ease-out`.

---

## 🚀 Execution Phases

### Phase 1: Foundation & Manifest (The Skeleton) [COMPLETED]
- **Goal:** Set up a secure Manifest V3 and the basic file structure.
- **Verification:** Load extension and verify background worker is active.

### Phase 2: The LRU Engine (The Brain) [COMPLETED]
- **Goal:** Implement the "Least Recently Used" tracking logic.
- **Verification:** Confirm `TAB_ORDER` updates in storage on tab activation.

### Phase 3: The Limiter & Parking Lot (The Utility) [COMPLETED]
- **Goal:** Auto-close tabs and save them for later.
- **Verification:** Confirm oldest tab is closed and saved to `PARKING_LOT` when limit is exceeded.

### Phase 4: Side Panel UI (The Experience) [COMPLETED]
- **Goal:** A premium, reactive interface.
- **Verification:** Confirm the Tab Meter and Parking Lot update in real-time with Glassmorphism styles.

### Phase 5: Focus Mode & Final Audit (The Polish) [COMPLETED]
- **Goal:** Add the Focus Timer and perform a security/performance review.
- **Verification:** Confirm the Focus Timer locks settings and sends a notification on completion.

---

## 🏁 Final Project Status: PRODUCTION READY
FocusFlow is fully implemented with a zero-slop, security-first architecture. All features are functional, and the UI meets premium Glassmorphism standards.



---

## 🛠️ Verification & Edge Case Handling
- **Edge Case 1:** User manually closes the LRU tab before the extension does. (The `TabManager` must handle `onRemoved` gracefully).
- **Edge Case 2:** Multiple windows open. (The extension should count total tabs across all windows).
- **Edge Case 3:** Limit is reduced *below* the current tab count. (The extension should trigger a "Cleanup" and park multiple tabs).

