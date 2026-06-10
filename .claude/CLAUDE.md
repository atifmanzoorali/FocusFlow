# FocusFlow — CLAUDE.md

Project context for AI coding sessions. Read this before making any changes.

---

## What This Is

FocusFlow is a free, open-source Chrome extension that prevents tab hoarding. It enforces a user-defined tab limit (1–20) and automatically parks excess tabs into a Parking Lot using LRU (Least Recently Used) logic. It includes a Focus Mode (Pomodoro-style timer) that locks settings and sweeps tabs down to the limit immediately on start.

Published on GitHub. Announced to LinkedIn audience for open-source code review.

---

## Tech Stack

- **Manifest V3** — Chrome extension platform, service worker architecture
- **Vanilla JavaScript** — No frameworks, no build tools, no npm dependencies
- **ES Modules** — `type: "module"` throughout, `import/export` syntax
- **chrome.storage.local** — All persistence, no external APIs
- **Side Panel API** — Main UI surface (320px wide panel)

---

## Folder Structure

```
FocusFlow/
├── .claude/               ← AI session files (plans, reports, task history)
│   └── plans/             ← Original implementation phase plans
├── background/
│   ├── background.js      ← Service worker: event routing, focus session logic
│   ├── storage-manager.js ← All chrome.storage.local reads/writes, sanitization
│   └── tab-manager.js     ← LRU tracking, auto-park logic
├── branding/
│   ├── zen-icon16.png
│   ├── zen-icon48.png
│   └── zen-icon128.png
├── sidepanel/
│   ├── sidepanel.html     ← UI markup
│   ├── sidepanel.css      ← Dark glassmorphism design system
│   └── sidepanel.js       ← UIManager: rendering, event binding, storage listener
├── tests/
│   ├── mock-chrome.js     ← Node.js Chrome API mock for unit tests
│   ├── unit-tests.js      ← 23 unit tests (run with: npm test)
│   └── stress-evals.js    ← Stress/eval scenarios
├── utils/
│   └── constants.js       ← All shared constants, frozen objects
├── CONTRIBUTING.md
├── LICENSE                ← MIT
├── manifest.json
├── package.json
└── QUALITY_REPORT.md      ← Production-readiness audit (public-facing)
```

---

## Architecture Rules

**Never break these — they are the foundation of correctness:**

1. **LRU array in TabManager** — `#tabHistory` is an ordered array. Tab activated → pushed to end (most recent). Tab removed → spliced out. The first non-active, non-pinned tab from the front is always the LRU candidate. `reconcileTabs()` rebuilds this from reality on every service worker restart.

2. **Storage-driven UI** — The sidepanel never updates its own state directly. It listens to `chrome.storage.onChanged` and re-renders from storage. Do not add direct JS state mutations to the UI layer.

3. **`force` flag on `checkTabLimit()`** — Without `force=true`, the method exits early if Focus Mode is not active. Auto-parking only enforces during Focus Mode (or when forced). Do not remove this gate.

4. **`#isProcessing` guard** — Prevents concurrent tab limit sweeps. Never remove this flag.

5. **Service worker is stateless across restarts** — MV3 kills the service worker frequently. All in-memory state (`#tabHistory`) must be reconcilable from `chrome.storage.local`. Do not add new in-memory state without a corresponding storage key and reconciliation step.

---

## Code Standards

- **No frameworks** — Vanilla JS only. No React, Vue, jQuery, lodash, etc.
- **Static class methods** with private fields (`#`) for encapsulation
- **Promise wrappers** around all Chrome callback APIs — use async/await at call sites
- **Always check `chrome.runtime.lastError`** after every Chrome API callback
- **`textContent` not `innerHTML`** for all user-controlled data
- **`chrome.runtime.getURL()`** for all extension asset URLs in service workers (not relative paths)
- **No inline scripts** — CSP is explicitly declared in manifest
- **Timestamp as unique ID** — Parked tabs are identified by `timestamp`, never by array index

---

## Security Rules (Non-Negotiable)

- All URLs stored in the parking lot are validated through `StorageManager.#sanitizeUrl()` — safe protocol whitelist: `http:`, `https:`, `file:`, `chrome:`, `chrome-extension:`
- All tab titles are sanitized through `StorageManager.#sanitizeText()` — strips `<` and `>`
- Favicon URLs rendered in UI are validated against a safe protocol whitelist before being set as `img.src`
- No `eval()`, no `new Function()`, no dynamic `import()`

---

## Running Tests

```bash
npm test
# or directly:
node tests/unit-tests.js
```

Tests run in Node.js (v18+) using a Chrome API mock in `tests/mock-chrome.js`. 23 tests cover: default settings, URL sanitization, XSS protection, parking lot max size, timestamp-based removal, LRU ordering, pinned tab protection, and auto-park enforcement.

---

## Storage Schema

```
chrome.storage.local keys:

focusflow_settings     → { tabLimit: 5, focusDuration: 25, autoParkEnabled: true, theme: 'dark' }
focusflow_parking_lot  → [{ url, title, favIconUrl, timestamp }, ...]  (max 50)
focusflow_tab_order    → [tabId, tabId, ...]  (LRU history, oldest first)
focusflow_focus_mode   → { active: boolean, endTime: number|null }
```

---

## Known Limitations (Acceptable)

- Auto-parking only enforces during Focus Mode — tabs are never automatically closed outside of a focus session. This is intentional UX behaviour.
- The 200ms debounce on `#saveTabHistory` means a service worker killed within that window could lose the last history write. `reconcileTabs()` self-heals on restart so no tabs are ever truly lost.
- Max 50 parked tabs. Oldest is trimmed when exceeded.
