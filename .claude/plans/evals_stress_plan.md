# FocusFlow: Evaluation & Stress Testing Plan (Product Resilience)

**Objective:** To evaluate the extension's performance under extreme conditions, its handling of complex browser states, and its security posture.

---

## 🌪️ 1. Stress & Performance Evaluation
### High Frequency Operations
- [ ] **Stress 1.1:** Open 20 tabs rapidly (using a script or rapid Ctrl+T).
  - Goal: No memory leaks and accurate final tab count (exactly equal to limit).
- [ ] **Stress 1.2:** Rapidly toggle Focus Mode and Settings.
  - Goal: No race conditions in storage updates.

### Resource Benchmarks
- [ ] **Eval 2.1:** Background Script Idle RAM. (Target: < 20MB).
- [ ] **Eval 2.2:** Side Panel Rendering. (Target: < 300ms for 50 parked tabs).
- [ ] **Eval 2.3:** Storage Quota check. (Verify `MAX_PARKING_LOT_SIZE` prevents exceeding 5MB limit).

---

## 🧩 2. Edge Case Matrix
### Browser Contexts
- [ ] **Edge 3.1:** **Incognito Tabs.** (Check if extension handles them; behavior should be to ignore them by default to protect privacy).
- [ ] **Edge 3.2:** **Pinned Tabs.** (Verify `getLRUTab` never selects a pinned tab for closure).
- [ ] **Edge 3.3:** **Multi-Window.** (Ensure tab count is global across all browser windows).
- [ ] **Edge 3.4:** **Internal Pages.** (Verify the extension doesn't crash when trying to park `chrome://` or `edge://` settings pages).

### System Events
- [ ] **Edge 4.1:** **Browser Crash/Force Kill.** (Verify `tabHistory` and `ParkingLot` are intact after restart).
- [ ] **Edge 4.2:** **Offline Mode.** (Verify no functionality is broken without internet).

---

## 🔒 3. Security & Safety Evaluation
### Data Integrity
- [ ] **Security 5.1: XSS Injection.** Rename a tab to `<img src=x onerror=alert(1)>`.
  - Goal: Side Panel renders title as plain text; no alert triggers.
- [ ] **Security 5.2: URL Sanitization.** Attempt to park a `javascript:alert(1)` URL.
  - Goal: URL is sanitized or rejected.

### Hardcore Enforcement
- [ ] **Security 6.1: Focus Bypass.** Try to modify the tab limit via the console or by direct storage injection while Focus Mode is active.
  - Goal: Background script rejects the change or immediately reverts it.

---

## 🎨 4. Aesthetic & UX Evaluation
- [ ] **Glassmorphism Audit:** Check blur and transparency levels on various background websites (Dark vs Light pages).
- [ ] **Contrast Check:** Verify text remains readable (WCAG AA standard) across all meter states (Green/Yellow/Red).
- [ ] **Motion Audit:** Ensure transitions are smooth (60fps) and not distracting.
