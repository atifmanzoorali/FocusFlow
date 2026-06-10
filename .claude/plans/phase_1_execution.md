# FocusFlow: Phase 1 - Foundation & Manifest (Execution Guide)

**Objective:** Establish the project structure and core configuration files following strict "Zero-Slop" and "Security-First" principles.

---

## 🛠️ Task 1: Project Structure Initialization
Create the following directory hierarchy to ensure modularity:
```text
FocusFlow/
├── background/
├── sidepanel/
├── utils/
└── assets/
```

## 🛠️ Task 2: Strict Manifest V3 Setup
Create `manifest.json` in the `FocusFlow/` root.
**Requirements:**
- Version: `3`
- Name: `FocusFlow: The Tab Limiter`
- Permissions: `["tabs", "storage", "sidePanel", "alarms"]`
- Host Permissions: None (Minimize surface area).
- Action: Define `default_title` and point to `sidepanel/sidepanel.html`.
- Background: Type `module` (crucial for modularity).
- Side Panel: Configure `default_path` to `sidepanel/sidepanel.html`.

## 🛠️ Task 3: App Constants & Configuration
Create `utils/constants.js`.
**Requirements:**
- Export a frozen object `APP_CONSTANTS`.
- Define keys for: `DEFAULT_TAB_LIMIT (5)`, `STORAGE_KEYS` (SETTINGS, PARKING_LOT, FOCUS_MODE), and `ALARM_NAMES`.
- **Anti-Slop:** Absolutely no hardcoded strings should be used in logic files later; everything must reference this file.

## 🛠️ Task 4: Modular Background Scaffolding
Create the initial service worker files:
1. `background/storage-manager.js`: Create a class `StorageManager` with a static `init()` method that sets default settings if they don't exist.
2. `background/background.js`: Import `StorageManager` and call `init()` on `chrome.runtime.onInstalled`.

---

## 🛡️ Quality Control Check (Phase 1)
*The executing agent must verify the following before completion:*

1. **Lint-Free:** No trailing spaces or inconsistent indentation.
2. **Naming:** All classes and files use `kebab-case` for files and `PascalCase` for classes.
3. **Security:** `manifest.json` does NOT contain any `content_security_policy` overrides.
4. **Modularity:** `background.js` should not contain storage logic; it must delegate to `StorageManager`.

---

## 🚩 Definition of Done
- Extension loads successfully in `chrome://extensions` without errors.
- Default settings are successfully populated in `chrome.storage.local`.
- Background service worker is active.
