export default function Card({ title, subtitle, actions, className = "", children }) {
  return (
    <article className={`ui-card ${className}`.trim()}>
      {(title || subtitle || actions) && (
        <header className="ui-card-header">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="ui-card-actions">{actions}</div> : null}
        </header>
      )}
      <div className="ui-card-body">{children}</div>
    </article>
  );
}
