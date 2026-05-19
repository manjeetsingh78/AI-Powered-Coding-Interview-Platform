import { Badge } from "../ui";

export default function PlagiarismBadge({ similarity = 0 }) {
  const percent = Number(similarity);
  const variant = percent >= 70 ? "danger" : percent >= 40 ? "warning" : "success";
  return <Badge variant={variant}>Similarity {percent}%</Badge>;
}
