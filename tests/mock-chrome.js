/**
 * Mock Chrome API for testing FocusFlow logic in Node.js
 */
const chrome = {
  storage: {
    local: {
      data: {},
      get: function(keys, callback) {
        const result = {};
        if (typeof keys === 'string') {
          result[keys] = this.data[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(k => result[k] = this.data[k]);
        } else if (keys === null) {
          Object.assign(result, this.data);
        }
        setTimeout(() => callback(result), 0);
      },
      set: function(items, callback) {
        Object.assign(this.data, items);
        if (callback) setTimeout(callback, 0);
      },
      onChanged: {
        addListener: () => {}
      }
    }
  },
  tabs: {
    tabsList: [],
    listeners: {
      onCreated: [],
      onRemoved: [],
      onActivated: [],
    },
    query: function(queryInfo, callback) {
      let filtered = this.tabsList;
      if (queryInfo.windowId !== undefined) {
        filtered = filtered.filter(t => t.windowId === queryInfo.windowId);
      }
      if (queryInfo.active !== undefined) {
        filtered = filtered.filter(t => t.active === queryInfo.active);
      }
      setTimeout(() => callback(filtered), 0);
    },
    remove: function(id, callback) {
      this.tabsList = this.tabsList.filter(t => t.id !== id);
      this.listeners.onRemoved.forEach(l => l(id, { windowId: 1, isWindowClosing: false }));
      if (callback) setTimeout(callback, 0);
    },
    create: function(createProperties, callback) {
      const newTab = {
        id: Math.floor(Math.random() * 10000),
        windowId: createProperties.windowId || 1,
        active: createProperties.active || false,
        pinned: createProperties.pinned || false,
        ...createProperties
      };
      this.tabsList.push(newTab);
      this.listeners.onCreated.forEach(l => l(newTab));
      if (callback) setTimeout(() => callback(newTab), 0);
    },
    get: function(id, callback) {
      const tab = this.tabsList.find(t => t.id === id);
      if (tab) {
        setTimeout(() => callback(tab), 0);
      } else {
        chrome.runtime.lastError = { message: 'Tab not found' };
        setTimeout(() => {
          callback(null);
          delete chrome.runtime.lastError;
        }, 0);
      }
    },
    onCreated:   { addListener: function(l) { chrome.tabs.listeners.onCreated.push(l); } },
    onRemoved:   { addListener: function(l) { chrome.tabs.listeners.onRemoved.push(l); } },
    onActivated: { addListener: function(l) { chrome.tabs.listeners.onActivated.push(l); } },
    onUpdated:   { addListener: () => {} }
  },
  runtime: {
    lastError: null,
    onInstalled: { addListener: () => {} },
    onStartup:   { addListener: () => {} },
    onMessage:   { addListener: () => {} },
    getURL: (path) => `chrome-extension://test-extension-id/${path}`
  },
  alarms: {
    create: () => {},
    clear:  () => {},
    onAlarm: { addListener: () => {} }
  },
  notifications: {
    create: () => {}
  }
};

global.chrome = chrome;
export default chrome;
