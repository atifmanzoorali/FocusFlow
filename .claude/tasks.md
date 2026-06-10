# FocusFlow Development Roadmap & Tasks

## Status: v1.0.0 (Zen Emerald Edition)
Current focus: **Production Hardening and UX Refinement.**

---

## ✅ Phase 1: Core Engine (Completed)
- [x] Implement Manifest V3 structure.
- [x] Build `TabManager` with basic tab counting.
- [x] Implement LRU (Least Recently Used) logic for tab parking.
- [x] Create `chrome.storage.local` persistence for the Parking Lot.
- [x] Create basic Side Panel UI.

## ✅ Phase 2: Zen Branding & UX (Completed)
- [x] Implement "Emerald Zen" design system (Dark Mode, Glassmorphism).
- [x] Fix card centering vs content alignment (Locked cards, left-aligned text).
- [x] Generate and optimize lightweight Zen icons (8KB-17KB) for Chrome toolbar.
- [x] Resolve Chrome icon caching issues via `branding/` folder rename.
- [x] Implement "Digital Valet" notifications for parked tabs.
- [x] Add "Focus Active" glowing badge for session clarity.

## ✅ Phase 3: Reliability & Performance (Completed)
- [x] Refactor `UIManager` to fix private field scope issues.
- [x] Implement `force=true` parameter in `checkTabLimit` to bypass async race conditions.
- [x] Unify Start/Stop focus logic into a single reliable event handler.
- [x] Fix "Immediate Sweep" bug—workspace now cleans up instantly when Focus starts.
- [x] Align Tab Limit card content (Label left, Input right).

---

## 🚀 Phase 4: Future Enhancements (Backlog)
- [ ] **Domain Whitelist**: Allow users to "Lock" certain domains (e.g., Gmail, Jira) so they are never parked.
- [ ] **Tab Statistics**: Add a counter for "Total Tabs Saved" to gamify the productivity experience.
- [ ] **Multiple Workspaces**: Allow different tab limits for "Work" vs "Play" modes.
- [ ] **Parking Lot Search**: Add a search bar to the Parking Lot for users with many parked tabs.

---

## 📖 Technical Memory for Next Session
- **Immediate Cleanup**: If Focus Mode isn't triggering immediately, check the `force` flag in `background.js` call to `TabManager.checkTabLimit()`.
- **CSS Layout**: Always use the `.settings` flexbox pattern for row-based card settings.
- **Icons**: If the toolbar icon breaks, check if the file size has exceeded 30KB. Keep them tiny!
