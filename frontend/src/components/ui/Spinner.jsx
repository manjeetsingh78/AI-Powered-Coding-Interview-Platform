export default function Spinner({ size = "md" }) {
  return <span className={`ui-spinner ui-spinner-${size}`} aria-label="Loading" />;
}
