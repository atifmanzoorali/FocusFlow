# FocusFlow: Lessons Learned & Quality Audit

To ensure the highest standards in future projects and to prevent regression, we are documenting these critical "Manifest & Integration" mistakes found during the final deployment.

---

## ❌ Mistake 1: Placeholder Asset References
- **Issue:** Specified `assets/icon16.png` (and others) in `manifest.json` but failed to generate the actual image files before deployment.
- **Consequence:** Extension failed to load with a "Could not load icon" error.
- **Lesson:** Never specify a path in a config file without verifying the physical file exists. **Follow the "No Placeholders" rule strictly.**

## ❌ Mistake 2: Manifest V3 Schema Violation
- **Issue:** Placed `"default_title": "FocusFlow"` as a top-level key in `manifest.json`.
- **Consequence:** Chrome rejected the manifest with an "Unrecognized manifest key" error. In MV3, this key must reside inside the `"action": {}` block.
- **Lesson:** Always validate the Manifest schema against the latest Chrome MV3 documentation. Top-level keys are extremely limited in V3.

## ❌ Mistake 4: UI Occlusion (Invisible Controls)
- **Issue:** Hidden the entire `.focus-controls` container when Focus started, which accidentally hid the "Stop Focus" button inside it.
- **Consequence:** Users could start a session but had no way to stop it, creating a "Locked-In" experience.
- **Lesson:** Be surgical with CSS `.hidden` classes. Never hide a parent container if it contains global actions (like Stop/Cancel).

## ❌ Mistake 5: JS Private Field Scoping
- **Issue:** Used `this.#render()` inside `requestAnimationFrame` or `chrome.storage` callbacks in `sidepanel.js`.
- **Consequence:** Runtime `SyntaxError` because `this` no longer referred to the class.
- **Lesson:** In static class methods, always use the explicit class name (e.g., `UIManager.#render()`) inside callbacks to ensure private access is preserved.

---

## 🛡️ Corrective Checklist for Future Projects:
1. [ ] **Verify Assets:** Run a check to confirm all icon/image paths in `manifest.json` exist.
2. [ ] **Schema Check:** Ensure `default_title`, `default_popup`, and `default_icon` are nested inside `action`.
3. [ ] **UI Behavior:** If using `sidePanel`, ensure `setPanelBehavior` is called in `onInstalled`.
4. [ ] **Mock Verification:** Update the automated test suite to verify the manifest syntax before the human ever sees it.
