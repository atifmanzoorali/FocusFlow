# FocusFlow — The Tab Limiter

A free, open-source Chrome extension that enforces a hard tab limit and automatically parks your excess tabs so nothing gets lost.

---

## The Problem

Most people have too many tabs open. It slows the browser, creates mental noise, and kills focus. But closing tabs feels risky — what if you need them later?

FocusFlow solves both sides of that problem. It limits how many tabs you can have open, and when the limit is hit, it parks the excess tabs in a safe list instead of closing them forever.

---

## What It Does

### Tab Limit
Set a hard cap on the number of open tabs — anywhere from 1 to 20. The extension shows you a live usage meter so you always know where you stand.

### Smart Auto-Parking (LRU)
When your tab count exceeds the limit during a Focus session, FocusFlow automatically moves the least recently used tab to the Parking Lot. It never touches your active tab or any pinned tabs — only the one you've ignored the longest.

### Parking Lot
Parked tabs are stored safely in a list inside the side panel. Each entry shows:
- The site's favicon
- The page title
- How long ago it was parked ("5m ago", "2h ago")
- A **Restore** button to reopen it instantly
- A **Delete** button to remove it permanently

The Parking Lot holds up to 50 tabs.

### Focus Mode
A built-in Pomodoro-style timer (5, 15, 25, 45, or 60 minutes). When you start a Focus session:
- The tab limit is locked — you cannot change it mid-session
- An immediate sweep runs — tabs above your limit are parked right away
- A countdown timer displays in the panel
- When the session ends, a browser notification fires and settings unlock

### Live Tab Meter
A progress bar at the top of the panel shows your current usage:
- **Green** — comfortable (under 80%)
- **Yellow** — getting crowded (80–99%)
- **Red + pulsing** — at the limit (100%)

---

## How to Install

### From Source (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer Mode** (toggle in the top-right corner)
4. Click **Load Unpacked** and select the `FocusFlow` folder
5. Click the FocusFlow icon in your toolbar to open the side panel

---

## How to Use

1. Open the side panel by clicking the FocusFlow icon in your Chrome toolbar
2. Set your **Tab Limit** using the number input (default is 5)
3. Browse normally — the meter updates in real time
4. When you're ready to focus, select a duration and click **Start Focus**
5. FocusFlow will sweep your tabs down to your limit immediately
6. Any parked tabs appear in the **Parking Lot** — restore them any time

---

## Features at a Glance

| Feature | Detail |
|---|---|
| Tab limit | 1–20 tabs, user-defined |
| Auto-parking | LRU — least recently used tab parked first |
| Protected tabs | Active tab and pinned tabs are never auto-parked |
| Parking Lot | Up to 50 tabs, with favicon, title, timestamp |
| Restore parked tab | One click, reopens the exact URL |
| Focus Mode | 5 / 15 / 25 / 45 / 60 minute timer |
| Focus sweep | Immediately parks excess tabs on session start |
| Live usage meter | Color-coded: green → yellow → red |
| Notifications | Tab parked + focus session complete |
| No account needed | Everything stored locally, zero data sent anywhere |

---

## Privacy

FocusFlow collects no data. Everything — your tab history, parking lot, settings — lives in `chrome.storage.local` on your machine. There are no servers, no analytics, no tracking of any kind.

**Permissions used:**
- `tabs` — to read and manage open tabs
- `storage` — to save your settings and parked tabs locally
- `sidePanel` — to render the side panel UI
- `alarms` — to run the Focus Mode countdown timer
- `notifications` — to notify you when a tab is parked or a session ends

---

## Tech Stack

Built with no frameworks and no dependencies — just the browser platform.

- Manifest V3
- Vanilla JavaScript (ES Modules)
- Chrome Side Panel API
- `chrome.storage.local` for all persistence
- `chrome.alarms` for the focus timer

---

## For Developers

The codebase is intentionally simple — no build step, no bundler, no transpilation. Load it in Chrome and it runs.

```
background/
  background.js       — Service worker, message routing, focus session
  tab-manager.js      — LRU tracking, auto-park logic
  storage-manager.js  — All storage reads/writes, input sanitization

sidepanel/
  sidepanel.html      — UI markup
  sidepanel.js        — UI rendering and event handling
  sidepanel.css       — Dark glassmorphism design

utils/
  constants.js        — Shared constants

tests/
  unit-tests.js       — 23 unit tests (run: npm test)
  mock-chrome.js      — Chrome API mock for Node.js
```

See [CONTRIBUTING.md](CONTRIBUTING.md) to run tests or submit a pull request.

---

## License

MIT — free to use, modify, and distribute. See [LICENSE](LICENSE).
