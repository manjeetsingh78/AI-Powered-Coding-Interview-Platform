export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function formatScore(value) {
  const number = Number(value || 0);
  return `${Math.round(number)}%`;
}

export function formatMemory(value) {
  const number = Number(value || 0);
  return `${number} MB`;
}

export function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
