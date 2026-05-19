import { Card } from "../ui";

function List({ title, rows }) {
  return (
    <div className="output-block">
      <h4>{title}</h4>
      {rows?.length ? (
        <ul>
          {rows.map((row, index) => (
            <li key={`${title}-${index}`}>{typeof row === "string" ? row : JSON.stringify(row)}</li>
          ))}
        </ul>
      ) : (
        <p>No data</p>
      )}
    </div>
  );
}

function TestResults({ rows }) {
  return (
    <div className="output-block">
      <h4>Tests</h4>
      {rows?.length ? (
        <div className="output-test-list">
          {rows.map((row, index) => {
            if (typeof row === "string") {
              return <pre key={`test-${index}`}>{row}</pre>;
            }

            return (
              <div key={`test-${index}`} className="output-test-item">
                <strong>Case #{index + 1}</strong>
                {row.custom ? <p>Mode: Custom</p> : null}
                <p>Input</p>
                <pre>{row.input || ""}</pre>
                <p>Expected Output</p>
                <pre>{row.expected_output || row.expected || "N/A"}</pre>
                <p>Actual Output</p>
                <pre>{row.actual_output || "N/A"}</pre>
                <p>
                  Verdict: {row.passed === null ? "Not graded" : row.passed ? "Passed" : "Failed"}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p>No data</p>
      )}
    </div>
  );
}

export default function OutputPanel({ result }) {
  return (
    <Card>
      <h3>Execution Output</h3>
      <List title="Stdout" rows={result?.stdout ? [result.stdout] : []} />
      <List title="Stderr" rows={result?.stderr ? [result.stderr] : []} />
      <TestResults rows={result?.tests || result?.test_results || []} />
    </Card>
  );
}
