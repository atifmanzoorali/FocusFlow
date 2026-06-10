import { APP_CONSTANTS } from '../utils/constants.js';
import { StorageManager } from './storage-manager.js';

/**
 * TabManager - Handles tab activity tracking and LRU logic
 * Maintains an ordered history of tab IDs by activity
 */
class TabManager {
  /** @type {number[]} */
  static #tabHistory = [];

  /** @type {boolean} */
  static #initialized = false;
  
  /** @type {boolean} */
  static #isProcessing = false;

  /** @type {ReturnType<typeof setTimeout>|null} */
  static #saveHistoryTimer = null;


  /**
   * Initializes the TabManager and sets up event listeners
   * @returns {Promise<boolean>}
   */
  static async init() {
    if (this.#initialized) {
      return true;
    }

    try {
      await this.reconcileTabs();

      this.#setupListeners();

      this.#initialized = true;
      console.log('TabManager: Initialized successfully');
      return true;
    } catch (error) {
      console.error('TabManager: Initialization failed', error);
      return false;
    }
  }

  /**
   * Reconciles internal history with the actual open tabs.
   * Useful for initialization and self-healing.
   * @returns {Promise<void>}
   */
  static async reconcileTabs() {
    return new Promise((resolve) => {
      chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.TAB_ORDER, (result) => {
        if (chrome.runtime.lastError) {
          this.#tabHistory = [];
          resolve();
          return;
        }

        const storedOrder = result[APP_CONSTANTS.STORAGE_KEYS.TAB_ORDER] || [];

        chrome.tabs.query({}, (tabs) => {
          if (chrome.runtime.lastError) {
            this.#tabHistory = [];
            resolve();
            return;
          }

          const activeTabIds = new Set(tabs.map(tab => tab.id));

          // Filter history to only include tabs that are currently open
          const validIds = storedOrder.filter(id =>
            typeof id === 'number' &&
            id > 0 &&
            activeTabIds.has(id)
          );

          // Add any new tabs not in history
          const currentTabIdsInHistory = new Set(validIds);
          for (const tab of tabs) {
            if (!currentTabIdsInHistory.has(tab.id) && this.#isValidTabId(tab.id)) {
              validIds.push(tab.id);
            }
          }

          this.#tabHistory = validIds;
          this.#saveTabHistory();
          resolve();
        });
      });
    });
  }

  /**
   * Sets up Chrome tab event listeners
   * @returns {void}
   */
  static #setupListeners() {
    chrome.tabs.onCreated.addListener((tab) => {
      this.#handleTabCreated(tab.id);
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      this.#handleTabRemoved(tabId);
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.#handleTabActivated(activeInfo.tabId);
    });

  }

  /**
   * Validates that a tab ID is a positive integer
   * @param {number} tabId
   * @returns {boolean}
   */
  static #isValidTabId(tabId) {
    return typeof tabId === 'number' && tabId > 0 && Number.isInteger(tabId);
  }

  /**
   * Handles tab creation - adds to end of history
   * @param {number} tabId
   * @returns {void}
   */
  static #handleTabCreated(tabId) {
    if (!this.#isValidTabId(tabId)) {
      return;
    }

    this.#removeFromHistory(tabId);
    this.#tabHistory.push(tabId);
    this.#saveTabHistory();
  }

  /**
   * Handles tab removal - removes from history
   * @param {number} tabId
   * @returns {void}
   */
  static #handleTabRemoved(tabId) {
    this.#removeFromHistory(tabId);
    this.#saveTabHistory();
  }

  /**
   * Handles tab activation - moves to end (most recently used)
   * @param {number} tabId
   * @returns {void}
   */
  static #handleTabActivated(tabId) {
    if (!this.#isValidTabId(tabId)) {
      return;
    }

    this.#removeFromHistory(tabId);
    this.#tabHistory.push(tabId);
    this.#saveTabHistory();
  }

  /**
   * Removes a tab ID from history
   * @param {number} tabId
   * @returns {void}
   */
  static #removeFromHistory(tabId) {
    const index = this.#tabHistory.indexOf(tabId);
    if (index > -1) {
      this.#tabHistory.splice(index, 1);
    }
  }

  /**
   * Saves tab history to storage, debounced to avoid excessive writes on rapid tab switching.
   * @returns {void}
   */
  static #saveTabHistory() {
    if (this.#saveHistoryTimer) clearTimeout(this.#saveHistoryTimer);
    this.#saveHistoryTimer = setTimeout(() => {
      this.#saveHistoryTimer = null;
      const data = { [APP_CONSTANTS.STORAGE_KEYS.TAB_ORDER]: this.#tabHistory };
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          console.error('TabManager: Failed to save tab history', chrome.runtime.lastError);
        }
      });
    }, 200);
  }

  /**
   * Gets the LRU tab (oldest non-active, non-pinned tab)
   * @returns {Promise<number|null>}
   */
  static async getLRUTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }

        const tabMap = new Map();
        for (const tab of tabs) {
          tabMap.set(tab.id, tab);
        }

        for (const tabId of this.#tabHistory) {
          const tab = tabMap.get(tabId);
          
          if (!tab) continue;
          if (tab.active) continue;
          if (tab.pinned) continue;

          resolve(tabId);
          return;
        }

        resolve(null);
      });
    });
  }

  /**
   * Gets a tab by ID
   * @param {number} tabId
   * @returns {Promise<chrome.tabs.Tab|null>}
   */
  static #getTab(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(tab);
      });
    });
  }

  /**
   * Gets the current tab history
   * @returns {number[]}
   */
  static getTabHistory() {
    return [...this.#tabHistory];
  }

  /**
   * Gets the current number of open tabs
   * @returns {Promise<number>}
   */
  static async getTabCount() {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
          resolve(0);
          return;
        }
        resolve(tabs.length);
      });
    });
  }

  /**
   * Auto-parks the LRU tab when limit is exceeded
   * @returns {Promise<boolean>}
   */
  static async autoParkLRUTab() {
    const lruTabId = await this.getLRUTab();

    if (!lruTabId) {
      return false;
    }

    return new Promise((resolve) => {
      chrome.tabs.get(lruTabId, async (tab) => {
        if (chrome.runtime.lastError) {
          console.error('TabManager: Failed to get tab for parking', chrome.runtime.lastError);
          resolve(false);
          return;
        }

        if (!tab || !tab.url) {
          resolve(false);
          return;
        }

        const tabData = {
          url: tab.url,
          title: tab.title || 'Untitled',
          favIconUrl: tab.favIconUrl || null
        };

        const saved = await StorageManager.addToParkingLot(tabData);

        if (saved) {
          chrome.tabs.remove(lruTabId, (removeError) => {
            if (removeError) {
              console.error('TabManager: Failed to close tab', removeError);
              resolve(false);
              return;
            }

            // Show notification
            chrome.notifications.create({
              type: 'basic',
              iconUrl: chrome.runtime.getURL('branding/zen-icon128.png'),
              title: 'Tab Parked',
              message: `"${tabData.title}" was moved to the Parking Lot.`,
              priority: 1
            });

            console.log('TabManager: Auto-parked tab', lruTabId);
            resolve(true);
          });
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Checks and enforces the tab limit
   * @returns {Promise<void>}
   */
  static async checkTabLimit(force = false) {
    if (this.#isProcessing) {
      return;
    }
    
    this.#isProcessing = true;

    try {
      // Only enforce limit if Focus Mode is active (unless forced)
      if (!force) {
        const focusState = await new Promise((resolve) => {
          chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.FOCUS_MODE, (result) => {
            resolve(result[APP_CONSTANTS.STORAGE_KEYS.FOCUS_MODE] || { active: false });
          });
        });

        if (!focusState.active) {
          return;
        }
      }

      const settings = await StorageManager.getSettings();

      if (!settings || !settings.autoParkEnabled) {
        return;
      }

      const tabLimit = settings.tabLimit;
      let currentCount = await this.getTabCount();

      while (currentCount > tabLimit) {
        const parked = await this.autoParkLRUTab();
        if (!parked) break;
        currentCount = await this.getTabCount();
      }
    } catch (error) {
      console.error('TabManager: Error checking tab limit', error);
    } finally {
      this.#isProcessing = false;
    }
  }

}

export { TabManager };