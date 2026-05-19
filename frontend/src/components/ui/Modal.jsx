export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="ui-modal-backdrop" role="dialog" aria-modal="true">
      <div className="ui-modal">
        <header className="ui-modal-header">
          <h3>{title}</h3>
          <button type="button" className="ui-modal-close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="ui-modal-body">{children}</div>
      </div>
    </div>
  );
}
