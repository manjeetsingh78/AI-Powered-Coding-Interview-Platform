import { Card, ProgressBar } from "../ui";

import PlagiarismBadge from "./PlagiarismBadge";
import VerdictBadge from "./VerdictBadge";

export default function AIFeedbackCard({ feedback = {} }) {
  return (
    <Card>
      <div className="feedback-head">
        <h3>AI Feedback</h3>
        <div className="feedback-badges">
          <VerdictBadge verdict={feedback.verdict || "maybe"} />
          <PlagiarismBadge similarity={feedback.similarity || 0} />
        </div>
      </div>
      <p>{feedback.summary || "No AI summary available yet."}</p>
      <ProgressBar value={feedback.quality_score || 0} />
      <ul className="feedback-list">
        {(feedback.strengths || []).map((item, index) => (
          <li key={`strength-${index}`}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}
