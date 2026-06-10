const APP_CONSTANTS = Object.freeze({
  DEFAULT_TAB_LIMIT: 5,

  STORAGE_KEYS: Object.freeze({
    SETTINGS: 'focusflow_settings',
    PARKING_LOT: 'focusflow_parking_lot',
    TAB_ORDER: 'focusflow_tab_order',
    FOCUS_MODE: 'focusflow_focus_mode'
  }),

  ALARM_NAMES: Object.freeze({
    FOCUS_TIMER: 'focusflow_focus_timer'
  }),

  DEFAULT_SETTINGS: Object.freeze({
    tabLimit: 5,
    focusDuration: 25,
    autoParkEnabled: true,
    theme: 'dark'
  }),

  MAX_PARKING_LOT_SIZE: 50,
  MAX_TAB_URL_LENGTH: 2048
});

export { APP_CONSTANTS };