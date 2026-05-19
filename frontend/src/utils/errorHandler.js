export function getErrorMessage(error, fallback = "Something went wrong") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.data?.error) return error.data.error;
  return fallback;
}

export function getFieldErrors(payload) {
  if (!payload || typeof payload !== "object") return {};
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => Array.isArray(value) || typeof value === "string")
  );
}
