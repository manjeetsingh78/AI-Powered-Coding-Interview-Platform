export default function Toast({ tone = "success", message }) {
  if (!message) return null;
  return <div className={`ui-toast ${tone}`}>{message}</div>;
}
