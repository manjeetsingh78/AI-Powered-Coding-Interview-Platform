export default function Select({ label, id, options = [], error, className = "", ...props }) {
  return (
    <label className={`ui-field ${className}`.trim()} htmlFor={id}>
      {label ? <span className="ui-field-label">{label}</span> : null}
      <select id={id} className={`ui-select ${error ? "error" : ""}`.trim()} {...props}>
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="ui-field-error">{error}</span> : null}
    </label>
  );
}
