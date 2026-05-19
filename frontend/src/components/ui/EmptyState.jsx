export default function EmptyState({ title, description }) {
  return (
    <div className="ui-empty">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
