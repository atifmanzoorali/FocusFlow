import { APP_CONSTANTS } from '../utils/constants.js';

class StorageManager {
  static async init() {
    return new Promise((resolve) => {
      chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.SETTINGS, (result) => {
        if (chrome.runtime.lastError) {
          console.error('StorageManager: Failed to get settings', chrome.runtime.lastError);
          resolve(false);
          return;
        }

        if (!result[APP_CONSTANTS.STORAGE_KEYS.SETTINGS]) {
          this.#setDefaults();
        }
        resolve(true);
      });
    });
  }

  static #setDefaults() {
    const defaults = {
      [APP_CONSTANTS.STORAGE_KEYS.SETTINGS]: APP_CONSTANTS.DEFAULT_SETTINGS,
      [APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT]: [],
      [APP_CONSTANTS.STORAGE_KEYS.TAB_ORDER]: [],
      [APP_CONSTANTS.STORAGE_KEYS.FOCUS_MODE]: { active: false, endTime: null }
    };

    chrome.storage.local.set(defaults, () => {
      if (chrome.runtime.lastError) {
        console.error('StorageManager: Failed to set defaults', chrome.runtime.lastError);
      }
    });
  }

  static async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.SETTINGS, (result) => {
        if (chrome.runtime.lastError) {
          console.error('StorageManager: Failed to get settings', chrome.runtime.lastError);
          resolve(null);
          return;
        }
        resolve(result[APP_CONSTANTS.STORAGE_KEYS.SETTINGS]);
      });
    });
  }

  static async setSettings(settings) {
    return new Promise((resolve) => {
      const data = { [APP_CONSTANTS.STORAGE_KEYS.SETTINGS]: settings };
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          console.error('StorageManager: Failed to set settings', chrome.runtime.lastError);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  /**
   * Adds a tab to the parking lot
   * @param {Object} tabData - Tab metadata {url, title, favIconUrl}
   * @returns {Promise<boolean>}
   */
  static async addToParkingLot(tabData) {
    return new Promise((resolve) => {
      chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT, (result) => {
        if (chrome.runtime.lastError) {
          console.error('StorageManager: Failed to get parking lot', chrome.runtime.lastError);
          resolve(false);
          return;
        }

        let parkedTabs = result[APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT] || [];

        if (parkedTabs.length >= APP_CONSTANTS.MAX_PARKING_LOT_SIZE) {
          parkedTabs = parkedTabs.slice(0, APP_CONSTANTS.MAX_PARKING_LOT_SIZE - 1);
        }

        const sanitizedTitle = this.#sanitizeText(tabData.title || 'Untitled');
        const sanitizedUrl = this.#sanitizeUrl(tabData.url);

        const newTab = {
          url: sanitizedUrl,
          title: sanitizedTitle,
          favIconUrl: tabData.favIconUrl || null,
          timestamp: Date.now()
        };

        parkedTabs.unshift(newTab);

        const data = { [APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT]: parkedTabs };
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            console.error('StorageManager: Failed to save to parking lot', chrome.runtime.lastError);
            resolve(false);
            return;
          }
          resolve(true);
        });
      });
    });
  }

  /**
   * Removes a tab from the parking lot by timestamp
   * @param {number} timestamp
   * @returns {Promise<boolean>}
   */
  static async removeFromParkingLot(timestamp) {
    return new Promise((resolve) => {
      chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT, (result) => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }

        const parkedTabs = result[APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT] || [];
        const filtered = parkedTabs.filter(tab => tab.timestamp !== timestamp);

        const data = { [APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT]: filtered };
        chrome.storage.local.set(data, () => {
          resolve(!chrome.runtime.lastError);
        });
      });
    });
  }

  /**
   * Gets all parked tabs
   * @returns {Promise<Array>}
   */
  static async getParkingLot() {
    return new Promise((resolve) => {
      chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT, (result) => {
        if (chrome.runtime.lastError) {
          resolve([]);
          return;
        }
        resolve(result[APP_CONSTANTS.STORAGE_KEYS.PARKING_LOT] || []);
      });
    });
  }

  /**
   * Sanitizes text to prevent XSS
   * @param {string} text
   * @returns {string}
   */
  static #sanitizeText(text) {
    if (typeof text !== 'string') {
      return 'Untitled';
    }
    return text.replace(/[<>]/g, '');
  }

  /**
   * Sanitizes and validates URL
   * @param {string} url
   * @returns {string}
   */
  static #sanitizeUrl(url) {
    if (typeof url !== 'string') return 'about:blank';
    try {
      const parsed = new URL(url);
      const SAFE_PROTOCOLS = ['http:', 'https:', 'file:', 'chrome:', 'chrome-extension:'];
      if (!SAFE_PROTOCOLS.includes(parsed.protocol)) return 'about:blank';
    } catch {
      return 'about:blank';
    }
    if (url.length > APP_CONSTANTS.MAX_TAB_URL_LENGTH) {
      return url.substring(0, APP_CONSTANTS.MAX_TAB_URL_LENGTH);
    }
    return url;
  }
}

export { StorageManager };