const KEY = "ui_notification_store";

const DEFAULT = {
  unread: 0,
  notifications: [],
};

export function getNotificationStore() {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || "{}")};
  } catch {
    return DEFAULT;
  }
}

export function setNotificationStore(next) {
  localStorage.setItem(KEY, JSON.stringify({ ...DEFAULT, ...next }));
}

export function clearNotificationStore() {
  localStorage.removeItem(KEY);
}
