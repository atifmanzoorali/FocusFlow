import { APP_CONSTANTS } from '../utils/constants.js';

class UIManager {
  static #renderRequested = false;
  static #focusInterval = null;

  static async init() {
    UIManager.#bindEvents();
    await UIManager.#render();
    await UIManager.#updateFocusUI();
  }

  static #bindEvents() {
    // Listen for storage changes to update UI reactively
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        if (changes[APP_CONSTANTS.STORAGE_KEYS.SETTINGS] ||
            changes[APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT] ||
            changes[APP_CONSTANTS.STORAGE_KEYS.FOCUS_MODE]) {
          UIManager.#handleStorageChange();
          UIManager.#updateFocusUI();
        }
      }
    });

    // Listen for tab changes to update the meter
    chrome.tabs.onCreated.addListener(() => {
      setTimeout(() => UIManager.#renderTabMeter(), 100);
    });

    chrome.tabs.onRemoved.addListener(() => {
      UIManager.#renderTabMeter();
    });

    chrome.tabs.onActivated.addListener(() => {
      UIManager.#renderTabMeter();
    });

    // Initialize UI-specific event listeners
    document.addEventListener('DOMContentLoaded', () => {
      UIManager.#setupLimitInput();
      UIManager.#setupFocusControls();
    });
  }

  static #setupLimitInput() {
    const limitInput = document.getElementById('limit-input');
    if (limitInput) {
      limitInput.addEventListener('change', async (e) => {
        const focusState = await UIManager.#getFocusState();
        if (focusState.active) return;

        const newLimit = parseInt(e.target.value, 10);
        if (newLimit >= 1 && newLimit <= 20) {
          const settings = await UIManager.#getSettings();
          settings.tabLimit = newLimit;
          await UIManager.#saveSettings(settings);
          await UIManager.#renderTabMeter();
        }
      });
    }
  }

  static #setupFocusControls() {
    const startBtn = document.getElementById('btn-start-focus');
    if (startBtn) {
      // Use a single unified handler to prevent event listener conflicts
      startBtn.onclick = async () => {
        const focusState = await UIManager.#getFocusState();
        if (focusState.active) {
          await UIManager.#stopFocus();
        } else {
          const durationSelect = document.getElementById('focus-duration');
          const duration = parseInt(durationSelect?.value || '25', 10);
          await UIManager.#startFocus(duration);
        }
      };
    }
  }

  static async #startFocus(durationMinutes) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'START_FOCUS',
        duration: durationMinutes
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('FocusFlow: Failed to send START_FOCUS', chrome.runtime.lastError);
          resolve();
          return;
        }
        if (response?.success) {
          UIManager.#updateFocusUI();
        }
        resolve();
      });
    });
  }

  static async #updateFocusUI() {
    const focusState = await UIManager.#getFocusState();
    const limitInput = document.getElementById('limit-input');
    const startBtn = document.getElementById('btn-start-focus');
    const focusBadge = document.getElementById('focus-badge');
    const focusTimer = document.getElementById('focus-timer');
    const focusControls = document.querySelector('.focus-controls');

    if (focusState.active) {
      if (limitInput) limitInput.disabled = true;
      if (focusControls) focusControls.classList.add('hidden');
      if (focusTimer) focusTimer.classList.remove('hidden');
      
      if (startBtn) {
        startBtn.textContent = 'Stop Focus';
        startBtn.classList.add('active');
      }
      
      if (focusBadge) focusBadge.classList.remove('hidden');

      UIManager.#startCountdown(focusState.endTime);
    } else {
      if (limitInput) limitInput.disabled = false;
      if (focusControls) focusControls.classList.remove('hidden');
      if (focusTimer) focusTimer.classList.add('hidden');

      if (startBtn) {
        startBtn.textContent = 'Start Focus';
        startBtn.classList.remove('active');
      }
      
      if (focusBadge) focusBadge.classList.add('hidden');

      UIManager.#stopCountdown();
    }
  }

  static #startCountdown(endTime) {
    UIManager.#stopCountdown();

    const focusTimer = document.getElementById('focus-timer');
    if (!focusTimer) return;

    focusTimer.classList.remove('hidden');

    const update = () => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        focusTimer.textContent = '00:00';
        UIManager.#stopCountdown();
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      focusTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    update();
    UIManager.#focusInterval = setInterval(update, 1000);
  }

  static #stopCountdown() {
    if (UIManager.#focusInterval) {
      clearInterval(UIManager.#focusInterval);
      UIManager.#focusInterval = null;
    }
  }

  static async #stopFocus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'STOP_FOCUS' }, () => {
        if (chrome.runtime.lastError) {
          console.error('FocusFlow: Failed to send STOP_FOCUS', chrome.runtime.lastError);
        }
        UIManager.#updateFocusUI();
        resolve();
      });
    });
  }

  static async #getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.SETTINGS, (result) => {
        resolve(result[APP_CONSTANTS.STORAGE_KEYS.SETTINGS] || {
          tabLimit: APP_CONSTANTS.DEFAULT_SETTINGS.tabLimit,
          autoParkEnabled: APP_CONSTANTS.DEFAULT_SETTINGS.autoParkEnabled
        });
      });
    });
  }

  static async #saveSettings(settings) {
    const focusState = await UIManager.#getFocusState();
    if (focusState.active) return false;

    return new Promise((resolve) => {
      const data = { [APP_CONSTANTS.STORAGE_KEYS.SETTINGS]: settings };
      chrome.storage.local.set(data, () => {
        resolve(!chrome.runtime.lastError);
      });
    });
  }

  static async #getFocusState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.FOCUS_MODE, (result) => {
        resolve(result[APP_CONSTANTS.STORAGE_KEYS.FOCUS_MODE] || { active: false, endTime: null });
      });
    });
  }

  static async #render() {
    await UIManager.#renderTabMeter();
    await UIManager.#renderParkingLot();
  }

  static async #renderTabMeter() {
    const settings = await UIManager.#getSettings();
    const tabCount = await UIManager.#getActiveTabCount();

    const tabCountEl = document.getElementById('tab-count');
    const meterFill = document.getElementById('meter-fill');
    const limitInput = document.getElementById('limit-input');

    if (tabCountEl) tabCountEl.textContent = `${tabCount} / ${settings.tabLimit}`;
    if (limitInput) limitInput.value = settings.tabLimit;

    if (meterFill) {
      const percentage = Math.min((tabCount / settings.tabLimit) * 100, 100);
      meterFill.style.width = `${percentage}%`;

      // Update classes based on pressure for gradients and glow effects
      meterFill.classList.remove('normal', 'warning', 'critical');
      
      if (percentage >= 100) {
        meterFill.classList.add('critical');
      } else if (percentage >= 80) {
        meterFill.classList.add('warning');
      } else {
        meterFill.classList.add('normal');
      }
    }
  }

  static async #getActiveTabCount() {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError || !tabs) {
          resolve(0);
          return;
        }
        resolve(tabs.length);
      });
    });
  }

  static async #renderParkingLot() {
    const parkingLotList = document.getElementById('parked-tabs');
    if (!parkingLotList) return;

    chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT, (result) => {
      const parkedTabs = result[APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT] || [];
      
      if (parkedTabs.length === 0) {
        parkingLotList.innerHTML = '<p class="empty-message">No parked tabs. Your workspace is clean.</p>';
      } else {
        const fragment = document.createDocumentFragment();

        parkedTabs.forEach((tab, index) => {
          const tabElement = UIManager.#createParkedTabElement(tab, index);
          fragment.appendChild(tabElement);
        });

        parkingLotList.innerHTML = '';
        parkingLotList.appendChild(fragment);
      }
    });
  }

  static #createParkedTabElement(tab, index) {
    const card = document.createElement('div');
    card.className = 'parked-tab';

    const info = document.createElement('div');
    info.className = 'parked-tab-info';

    const favicon = document.createElement('img');
    favicon.className = 'tab-favicon';
    const SAFE_FAVICON_PROTOCOLS = ['http:', 'https:', 'data:', 'chrome:', 'chrome-extension:'];
    let faviconSrc = '../branding/zen-icon16.png';
    if (tab.favIconUrl) {
      try {
        const parsed = new URL(tab.favIconUrl);
        if (SAFE_FAVICON_PROTOCOLS.includes(parsed.protocol)) faviconSrc = tab.favIconUrl;
      } catch { /* invalid URL, use default */ }
    }
    favicon.src = faviconSrc;
    favicon.onerror = () => { favicon.src = '../branding/zen-icon16.png'; };

    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = tab.title;

    const timeAgo = document.createElement('span');
    timeAgo.className = 'tab-time';
    timeAgo.textContent = UIManager.#formatRelativeTime(tab.timestamp);

    info.appendChild(favicon);
    info.appendChild(title);
    info.appendChild(timeAgo);

    const actions = document.createElement('div');
    actions.className = 'tab-actions';

    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'btn-restore';
    restoreBtn.textContent = 'Restore';
    restoreBtn.addEventListener('click', () => UIManager.#restoreTab(tab.timestamp));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => UIManager.#deleteParkedTab(tab.timestamp));

    actions.appendChild(restoreBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(info);
    card.appendChild(actions);

    return card;
  }

  static async #restoreTab(timestamp) {
    return new Promise((resolve) => {
      chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT, (result) => {
        const parkedTabs = result[APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT] || [];
        const tabToRestore = parkedTabs.find(tab => tab.timestamp === timestamp);

        if (tabToRestore) {
          chrome.tabs.create({ url: tabToRestore.url }, () => {
            const updated = parkedTabs.filter(tab => tab.timestamp !== timestamp);
            const data = { [APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT]: updated };
            chrome.storage.local.set(data, () => {
              UIManager.#renderTabMeter();
              UIManager.#renderParkingLot();
              resolve();
            });
          });
        } else {
          resolve();
        }
      });
    });
  }

  static async #deleteParkedTab(timestamp) {
    return new Promise((resolve) => {
      chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT, (result) => {
        const parkedTabs = result[APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT] || [];
        const updated = parkedTabs.filter(tab => tab.timestamp !== timestamp);

        const data = { [APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT]: updated };
        chrome.storage.local.set(data, () => {
          UIManager.#renderParkingLot();
          resolve();
        });
      });
    });
  }

  static #formatRelativeTime(timestamp) {
    if (!timestamp) return 'Unknown';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  static async #handleStorageChange() {
    if (UIManager.#renderRequested) return;
    UIManager.#renderRequested = true;

    requestAnimationFrame(async () => {
      UIManager.#renderRequested = false;
      await UIManager.#render();
    });
  }
}

// Global initialization
UIManager.init();