import { Card } from "../ui";

export default function ScoreChart({ rows = [] }) {
  const max = Math.max(1, ...rows.map((row) => Number(row.score || 0)));

  return (
    <Card>
      <h3>Score Distribution</h3>
      <div className="score-chart">
        {rows.map((row, index) => (
          <div className="score-chart-row" key={`bar-${index}`}>
            <span>{row.name || `Candidate ${index + 1}`}</span>
            <div className="score-chart-bar-wrap">
              <div className="score-chart-bar" style={{ width: `${(Number(row.score || 0) / max) * 100}%` }} />
            </div>
            <strong>{row.score || 0}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}
