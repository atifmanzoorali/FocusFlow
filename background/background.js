import { StorageManager } from './storage-manager.js';
import { TabManager } from './tab-manager.js';
import { APP_CONSTANTS } from '../utils/constants.js';

chrome.runtime.onInstalled.addListener(async () => {
  // Set behavior to open side panel on click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  const initialized = await StorageManager.init();

  if (initialized) {
    console.log('FocusFlow: Extension initialized successfully');
  } else {
    console.error('FocusFlow: Extension initialization failed');
  }

  await TabManager.init();
  console.log('FocusFlow: TabManager started');

  await TabManager.checkTabLimit();
});

chrome.runtime.onStartup.addListener(async () => {
  const initialized = await StorageManager.init();
  if (initialized) {
    console.log('FocusFlow: Extension started successfully');
  }

  await TabManager.init();
});

chrome.tabs.onCreated.addListener(async (tab) => {
  setTimeout(() => {
    TabManager.checkTabLimit();
  }, 100);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[APP_CONSTANTS.STORAGE_KEYS.SETTINGS]) {
    const newSettings = changes[APP_CONSTANTS.STORAGE_KEYS.SETTINGS].newValue;
    const oldSettings = changes[APP_CONSTANTS.STORAGE_KEYS.SETTINGS].oldValue;

    if (oldSettings && newSettings && newSettings.tabLimit < oldSettings.tabLimit) {
      TabManager.checkTabLimit();
    }
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === APP_CONSTANTS.ALARM_NAMES.FOCUS_TIMER) {
    endFocusSession();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_FOCUS') {
    startFocusSession(message.duration).then(() => sendResponse({ success: true }));
    return true;
  } else if (message.type === 'STOP_FOCUS') {
    stopFocusSession().then(() => sendResponse({ success: true }));
    return true;
  } else if (message.type === 'GET_FOCUS_STATE') {
    getFocusState().then(state => sendResponse(state));
    return true;
  }
});

async function startFocusSession(durationMinutes) {
  const endTime = Date.now() + (durationMinutes * 60 * 1000);
  const focusMode = { active: true, endTime };
  const data = { [APP_CONSTANTS.STORAGE_KEYS.FOCUS_MODE]: focusMode };

  await new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });

  chrome.alarms.create(APP_CONSTANTS.ALARM_NAMES.FOCUS_TIMER, { delayInMinutes: durationMinutes });
  await TabManager.checkTabLimit(true);
}

async function stopFocusSession() {
  chrome.alarms.clear(APP_CONSTANTS.ALARM_NAMES.FOCUS_TIMER);

  return new Promise((resolve) => {
    const focusMode = { active: false, endTime: null };
    const data = { [APP_CONSTANTS.STORAGE_KEYS.FOCUS_MODE]: focusMode };
    chrome.storage.local.set(data, resolve);
  });
}

async function endFocusSession() {
  await stopFocusSession();

  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('branding/zen-icon128.png'),
    title: 'Focus Session Complete',
    message: 'Your focus session has ended. Great work staying focused!',
    priority: 1
  });
}

async function getFocusState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(APP_CONSTANTS.STORAGE_KEYS.FOCUS_MODE, (result) => {
      if (chrome.runtime.lastError) {
        resolve({ active: false, endTime: null });
        return;
      }
      resolve(result[APP_CONSTANTS.STORAGE_KEYS.FOCUS_MODE] || { active: false, endTime: null });
    });
  });
}