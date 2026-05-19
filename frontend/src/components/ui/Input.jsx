export default function Input({ label, id, hint, error, className = "", ...props }) {
  return (
    <label className={`ui-field ${className}`.trim()} htmlFor={id}>
      {label ? <span className="ui-field-label">{label}</span> : null}
      <input id={id} className={`ui-input ${error ? "error" : ""}`.trim()} {...props} />
      {error ? <span className="ui-field-error">{error}</span> : hint ? <span className="ui-field-hint">{hint}</span> : null}
    </label>
  );
}
