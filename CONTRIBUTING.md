# Contributing to FocusFlow

Thank you for your interest in contributing. FocusFlow is a free, open-source Chrome extension built to help people focus by limiting tab hoarding.

---

## Running the Extension Locally

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer Mode** (top right toggle)
4. Click **Load Unpacked** and select the `FocusFlow` folder
5. The extension will appear in your toolbar — click it to open the side panel

---

## Running the Tests

Tests run in Node.js (v18+):

```bash
node --experimental-vm-modules tests/unit-tests.js
```

All tests should pass before submitting a pull request.

---

## Reporting a Bug

1. Go to [Issues](https://github.com/atifmanzoor/focusflow/issues)
2. Click **New Issue**
3. Describe what happened, what you expected, and your Chrome version
4. Screenshots or screen recordings are very helpful

---

## Submitting a Pull Request

1. Fork the repository
2. Create a new branch: `git checkout -b fix/your-fix-name`
3. Make your changes
4. Run the tests and confirm they pass
5. Open a pull request with a clear description of what changed and why

---

## Code Standards

- Vanilla JavaScript only — no frameworks, no build tools
- Manifest V3
- All Chrome API calls must check `chrome.runtime.lastError`
- No `innerHTML` with user-controlled data
- Keep commits focused — one fix or feature per PR
