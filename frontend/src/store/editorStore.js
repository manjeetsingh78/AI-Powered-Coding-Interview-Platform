const KEY = "ui_editor_store";

const DEFAULT = {
  language: "javascript",
  code: "",
  isRunning: false,
  lastResult: null,
};

export function getEditorStore() {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || "{}")};
  } catch {
    return DEFAULT;
  }
}

export function setEditorStore(next) {
  localStorage.setItem(KEY, JSON.stringify({ ...DEFAULT, ...next }));
}

export function clearEditorStore() {
  localStorage.removeItem(KEY);
}
