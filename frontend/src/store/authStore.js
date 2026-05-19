const KEY = "ui_auth_store";

export function getAuthStore() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function setAuthStore(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearAuthStore() {
  localStorage.removeItem(KEY);
}
