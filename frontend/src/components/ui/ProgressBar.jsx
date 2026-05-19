export default function ProgressBar({ value = 0, max = 100 }) {
  const normalized = Math.max(0, Math.min(max, value));
  const percent = max ? Math.round((normalized / max) * 100) : 0;
  return (
    <div className="ui-progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={normalized}>
      <div className="ui-progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
